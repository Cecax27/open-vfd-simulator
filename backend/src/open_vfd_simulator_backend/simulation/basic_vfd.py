from __future__ import annotations

from math import pi

from open_vfd_simulator_backend.domain.models import (
    DeviceRecord,
    DeviceStatus,
    LoadType,
    TelemetrySnapshot,
)


class BasicVFDSimulator:
    def step(self, device: DeviceRecord, delta_time_s: float) -> DeviceRecord:
        runtime = device.runtime
        telemetry = device.telemetry.model_copy(deep=True)
        motor = device.motor
        load = device.load

        if runtime.status == DeviceStatus.FAULT:
            return device.model_copy(
                update={
                    "telemetry": telemetry.model_copy(
                        update={
                            "commanded_frequency_hz": 0.0,
                            "output_frequency_hz": 0.0,
                            "output_voltage_v": 0.0,
                            "output_current_a": 0.0,
                        }
                    )
                }
            )

        commanded_frequency_hz = 0.0
        if runtime.status == DeviceStatus.RUNNING:
            commanded_frequency_hz = motor.rated_frequency_hz * (runtime.speed_reference_pct / 100.0)

        output_frequency_hz = self._ramp_frequency(
            current_frequency_hz=telemetry.output_frequency_hz,
            target_frequency_hz=commanded_frequency_hz,
            acceleration_time_s=runtime.acceleration_time_s,
            deceleration_time_s=runtime.deceleration_time_s,
            rated_frequency_hz=motor.rated_frequency_hz,
            delta_time_s=delta_time_s,
        )

        output_voltage_v = self._calculate_output_voltage(
            output_frequency_hz=output_frequency_hz,
            rated_frequency_hz=motor.rated_frequency_hz,
            rated_voltage_v=motor.rated_voltage_v,
        )

        load_torque_nm = self._calculate_load_torque(
            load_type=load.load_type,
            nominal_load_torque_nm=load.nominal_load_torque_nm,
            speed_rpm=telemetry.speed_rpm,
            rated_speed_rpm=motor.rated_speed_rpm,
        )

        electromagnetic_torque_nm = self._calculate_motor_torque(
            output_frequency_hz=output_frequency_hz,
            rated_frequency_hz=motor.rated_frequency_hz,
            current_speed_rpm=telemetry.speed_rpm,
            rated_speed_rpm=motor.rated_speed_rpm,
            rated_power_w=motor.rated_power_w,
            rated_voltage_v=motor.rated_voltage_v,
            output_voltage_v=output_voltage_v,
        )

        next_speed_rpm = self._calculate_next_speed(
            current_speed_rpm=telemetry.speed_rpm,
            electromagnetic_torque_nm=electromagnetic_torque_nm,
            load_torque_nm=load_torque_nm,
            friction_coefficient=motor.friction_coefficient,
            total_inertia_kgm2=motor.inertia_kgm2 + load.load_inertia_kgm2,
            delta_time_s=delta_time_s,
        )

        output_current_a = self._calculate_output_current(
            rated_current_a=motor.rated_current_a,
            rated_power_w=motor.rated_power_w,
            rated_speed_rpm=motor.rated_speed_rpm,
            electromagnetic_torque_nm=electromagnetic_torque_nm,
            output_frequency_hz=output_frequency_hz,
            rated_frequency_hz=motor.rated_frequency_hz,
        )

        estimated_temperature_c = self._calculate_temperature(
            current_temperature_c=telemetry.estimated_temperature_c,
            output_current_a=output_current_a,
            rated_current_a=motor.rated_current_a,
            run_state=runtime.status,
            delta_time_s=delta_time_s,
        )

        fault_code = 0
        next_status = runtime.status
        if output_current_a > motor.rated_current_a * 2.0:
            fault_code = 1001
            next_status = DeviceStatus.FAULT
            commanded_frequency_hz = 0.0
            output_frequency_hz = 0.0
            output_voltage_v = 0.0
            output_current_a = 0.0

        mechanical_power_w = electromagnetic_torque_nm * ((next_speed_rpm * 2 * pi) / 60.0)

        return device.model_copy(
            update={
                "runtime": runtime.model_copy(update={"status": next_status}),
                "telemetry": TelemetrySnapshot(
                    fault_code=fault_code,
                    commanded_frequency_hz=commanded_frequency_hz,
                    output_frequency_hz=output_frequency_hz,
                    output_voltage_v=output_voltage_v,
                    output_current_a=output_current_a,
                    speed_rpm=next_speed_rpm,
                    electromagnetic_torque_nm=electromagnetic_torque_nm,
                    load_torque_nm=load_torque_nm,
                    mechanical_power_w=mechanical_power_w,
                    estimated_temperature_c=estimated_temperature_c,
                ),
            }
        )

    def _ramp_frequency(
        self,
        current_frequency_hz: float,
        target_frequency_hz: float,
        acceleration_time_s: float,
        deceleration_time_s: float,
        rated_frequency_hz: float,
        delta_time_s: float,
    ) -> float:
        if target_frequency_hz >= current_frequency_hz:
            rate_hz_per_s = rated_frequency_hz / acceleration_time_s
        else:
            rate_hz_per_s = rated_frequency_hz / deceleration_time_s

        max_delta_hz = rate_hz_per_s * delta_time_s
        frequency_error_hz = target_frequency_hz - current_frequency_hz

        if abs(frequency_error_hz) <= max_delta_hz:
            return target_frequency_hz

        return current_frequency_hz + max_delta_hz * (1 if frequency_error_hz > 0 else -1)

    def _calculate_output_voltage(
        self,
        output_frequency_hz: float,
        rated_frequency_hz: float,
        rated_voltage_v: float,
    ) -> float:
        if output_frequency_hz <= 0:
            return 0.0

        frequency_ratio = min(output_frequency_hz / rated_frequency_hz, 1.0)
        return rated_voltage_v * frequency_ratio

    def _calculate_load_torque(
        self,
        load_type: LoadType,
        nominal_load_torque_nm: float,
        speed_rpm: float,
        rated_speed_rpm: float,
    ) -> float:
        if load_type == LoadType.FAN:
            speed_ratio = speed_rpm / rated_speed_rpm if rated_speed_rpm else 0.0
            return nominal_load_torque_nm * max(speed_ratio, 0.0) ** 2
        return nominal_load_torque_nm

    def _calculate_motor_torque(
        self,
        output_frequency_hz: float,
        rated_frequency_hz: float,
        current_speed_rpm: float,
        rated_speed_rpm: float,
        rated_power_w: float,
        rated_voltage_v: float,
        output_voltage_v: float,
    ) -> float:
        if output_frequency_hz <= 0:
            return 0.0

        base_speed_rad_s = (rated_speed_rpm * 2 * pi) / 60.0
        rated_torque_nm = rated_power_w / base_speed_rad_s if base_speed_rad_s > 0 else 0.0
        target_speed_rpm = rated_speed_rpm * (output_frequency_hz / rated_frequency_hz)
        speed_error_rpm = target_speed_rpm - current_speed_rpm
        voltage_ratio = output_voltage_v / rated_voltage_v if rated_voltage_v else 0.0
        torque_gain = max(rated_torque_nm / max(rated_speed_rpm * 0.1, 1.0), 0.002)
        raw_torque_nm = speed_error_rpm * torque_gain * (0.5 + voltage_ratio)
        torque_limit_nm = max(rated_torque_nm * 1.8, 0.1)
        return max(-torque_limit_nm, min(raw_torque_nm, torque_limit_nm))

    def _calculate_next_speed(
        self,
        current_speed_rpm: float,
        electromagnetic_torque_nm: float,
        load_torque_nm: float,
        friction_coefficient: float,
        total_inertia_kgm2: float,
        delta_time_s: float,
    ) -> float:
        current_speed_rad_s = (current_speed_rpm * 2 * pi) / 60.0
        friction_torque_nm = friction_coefficient * current_speed_rad_s
        acceleration_rad_s2 = (
            electromagnetic_torque_nm - load_torque_nm - friction_torque_nm
        ) / max(total_inertia_kgm2, 1e-6)
        next_speed_rad_s = max(current_speed_rad_s + acceleration_rad_s2 * delta_time_s, 0.0)
        return (next_speed_rad_s * 60.0) / (2 * pi)

    def _calculate_output_current(
        self,
        rated_current_a: float,
        rated_power_w: float,
        rated_speed_rpm: float,
        electromagnetic_torque_nm: float,
        output_frequency_hz: float,
        rated_frequency_hz: float,
    ) -> float:
        if output_frequency_hz <= 0:
            return 0.0

        base_speed_rad_s = (rated_speed_rpm * 2 * pi) / 60.0
        rated_torque_nm = rated_power_w / base_speed_rad_s if base_speed_rad_s > 0 else 1.0
        torque_ratio = abs(electromagnetic_torque_nm) / max(rated_torque_nm, 0.1)
        magnetizing_component_a = rated_current_a * max(output_frequency_hz / rated_frequency_hz, 0.1) * 0.2
        torque_component_a = rated_current_a * torque_ratio * 0.65
        return magnetizing_component_a + torque_component_a

    def _calculate_temperature(
        self,
        current_temperature_c: float,
        output_current_a: float,
        rated_current_a: float,
        run_state: DeviceStatus,
        delta_time_s: float,
    ) -> float:
        ambient_c = 25.0
        if run_state != DeviceStatus.RUNNING or output_current_a <= 0:
            cooling_rate_c_per_s = 0.08
            return max(current_temperature_c - cooling_rate_c_per_s * delta_time_s, ambient_c)

        current_ratio = output_current_a / max(rated_current_a, 0.1)
        heating_rate_c_per_s = 0.18 * current_ratio * current_ratio
        cooling_rate_c_per_s = 0.03 * max(current_temperature_c - ambient_c, 0.0)
        return current_temperature_c + (heating_rate_c_per_s - cooling_rate_c_per_s) * delta_time_s


simulator = BasicVFDSimulator()