import pytest

from cbpi4_usb_flow.protocol import (
    FlowDevice,
    format_line,
    liters_per_minute,
    milliliters,
    parse_line,
    pulses_per_liter,
)


def test_milliliters_matches_firmware_integer_math():
    assert milliliters(0, 450) == 0
    assert milliliters(225, 450) == 500
    assert milliliters(450, 450) == 1000
    assert milliliters(5880, 5880) == 1000


def test_liters_per_minute_window():
    assert liters_per_minute(0, 450, 1000) == 0
    assert liters_per_minute(75, 450, 1000) == pytest.approx(10.0)
    assert liters_per_minute(450, 450, 60000) == pytest.approx(1.0)


def test_calibration_rounding():
    assert pulses_per_liter(462, 1) == 462
    assert pulses_per_liter(675, 1.5) == 450


def test_calibration_rejects_empty_sample():
    with pytest.raises(ValueError):
        pulses_per_liter(100, 0)


def test_parse_line_reads_firmware_json_and_ignores_noise():
    reading = parse_line(b'{"ml":1234,"lpm":6.2,"pulses":555,"ppl":450}\n')
    assert reading is not None
    assert reading.ml == 1234
    assert reading.lpm == pytest.approx(6.2)
    assert reading.pulses == 555
    assert reading.ppl == 450
    assert parse_line("RESET") is None
    assert parse_line(b"") is None
    assert parse_line("{not json") is None


def test_format_roundtrip():
    reading = parse_line('{"ml":10,"lpm":1.5,"pulses":4,"ppl":450,"pong":1}')
    assert reading is not None
    again = parse_line(format_line(reading))
    assert again is not None
    assert again.ml == 10
    assert again.pong is True


def test_device_counts_volume_and_flow():
    device = FlowDevice(ppl=450, now=0)
    device.add_pulses(75)
    device.advance(1)
    assert device.milliliters() == 166
    assert device.lpm == pytest.approx(10.0)
    device.advance(2.1)
    assert device.lpm == 0


def test_device_commands():
    device = FlowDevice(ppl=450, now=0)
    device.add_pulses(450)
    device.handle("CAL 5880")
    assert device.ppl == 5880
    assert device.milliliters() == milliliters(450, 5880)
    device.handle("RESET")
    assert device.pulses == 0
    assert device.milliliters() == 0
    pong = device.handle("PING")
    assert pong is not None
    parsed = parse_line(pong)
    assert parsed is not None
    assert parsed.pong is True
    device.handle("CAL nein")
    assert device.ppl == 5880
