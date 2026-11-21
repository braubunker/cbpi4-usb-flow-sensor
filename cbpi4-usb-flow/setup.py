from os import path

from setuptools import setup

this_directory = path.abspath(path.dirname(__file__))
with open(path.join(this_directory, "README.md"), encoding="utf-8") as handle:
    long_description = handle.read()

setup(
    name="cbpi4-usb-flow",
    version="0.1.1",
    description="CraftBeerPi-4-Sensor für einen USB-Durchflussmesser",
    author="Leitmass",
    url="",
    license="GPLv3",
    include_package_data=True,
    package_data={"cbpi4_usb_flow": ["config.yaml"]},
    packages=["cbpi4_usb_flow"],
    install_requires=["pyserial>=3.5"],
    long_description=long_description,
    long_description_content_type="text/markdown",
)
