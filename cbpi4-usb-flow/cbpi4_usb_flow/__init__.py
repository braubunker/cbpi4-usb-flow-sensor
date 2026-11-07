def setup(cbpi):
    from cbpi4_usb_flow.sensor import UsbFillStep, UsbFlowSensor

    cbpi.plugin.register("USB Durchflussmesser", UsbFlowSensor)
    cbpi.plugin.register("USB Tank fuellen", UsbFillStep)
