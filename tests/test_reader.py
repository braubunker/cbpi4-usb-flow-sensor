import queue
import time

from cbpi4_usb_flow.reader import SerialFlowReader


class QueuePort:
    def __init__(self):
        self.incoming: queue.Queue[bytes] = queue.Queue()
        self.outgoing: queue.Queue[bytes] = queue.Queue()
        self.closed = False

    def readline(self):
        if self.closed:
            raise OSError("closed")
        try:
            return self.incoming.get(timeout=0.2)
        except queue.Empty:
            return b""

    def write(self, data: bytes):
        self.outgoing.put(data)
        return len(data)

    def reset_input_buffer(self):
        while not self.incoming.empty():
            try:
                self.incoming.get_nowait()
            except queue.Empty:
                break

    def close(self):
        self.closed = True


def wait_until(predicate, timeout=2.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(0.02)
    return False


def test_reader_parses_samples_and_sends_reset():
    port = QueuePort()
    reader = SerialFlowReader("mem", open_port=lambda *_args, **_kwargs: port)
    reader.start()
    try:
        assert wait_until(lambda: reader._ser is port)
        port.incoming.put(b'{"ml":4500,"lpm":3.5,"pulses":2025,"ppl":450}\n')
        assert wait_until(lambda: reader.latest() is not None and reader.latest().ml == 4500)
        assert reader.connected is True
        reader.send("RESET")
        assert port.outgoing.get(timeout=1) == b"RESET\n"
        assert reader.latest().ml == 0
    finally:
        reader.stop()


def test_reader_drops_stale_volume_right_after_reset():
    port = QueuePort()
    reader = SerialFlowReader("mem", open_port=lambda *_args, **_kwargs: port)
    reader.start()
    try:
        assert wait_until(lambda: reader._ser is port)
        port.incoming.put(b'{"ml":5000,"lpm":1,"pulses":2250,"ppl":450}\n')
        assert wait_until(lambda: reader.latest() is not None and reader.latest().ml == 5000)
        reader.send("RESET")
        port.incoming.put(b'{"ml":5000,"lpm":1,"pulses":2250,"ppl":450}\n')
        time.sleep(0.2)
        assert reader.latest().ml == 0
        time.sleep(0.35)
        port.incoming.put(b'{"ml":100,"lpm":0.5,"pulses":45,"ppl":450}\n')
        assert wait_until(lambda: reader.latest() is not None and reader.latest().ml == 100)
    finally:
        reader.stop()
