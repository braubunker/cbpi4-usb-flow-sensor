/*
 * Leitmass — USB-Durchflussmesser für CraftBeerPi 4
 *
 * Hall-Sensor an Pin D2. USB-Serial 115200 8N1.
 * Alle 250 ms eine Zeile:
 *   {"ml":1234,"lpm":6.2,"pulses":555,"ppl":450}
 *
 * Befehle:
 *   RESET     Zähler auf null, Kalibrierung bleibt
 *   CAL 450   Impulse pro Liter, wird im EEPROM gespeichert
 *   PING      sofort eine Zeile mit "pong":1
 *
 * Verdrahtung (5-V-Arduino Nano):
 *   Sensor rot    -> 5V
 *   Sensor schwarz -> GND
 *   Sensor gelb   -> D2
 *   USB           -> Raspberry Pi
 *
 * Das gelbe Signal nicht an einen GPIO des Pi legen.
 * YF-S201: etwa 450 Impulse pro Liter, nur kaltes Wasser.
 * Rechnung: ml = Impulse * 1000 / ImpulseProLiter
 *           L/min = ImpulseImFenster * 60000 / ImpulseProLiter / FensterMs
 */

#include <Arduino.h>
#include <EEPROM.h>

static const uint8_t SENSOR_PIN = 2;
static const uint32_t BAUD = 115200;
static const uint32_t REPORT_MS = 250;
static const uint32_t FLOW_WINDOW_MS = 1000;
static const uint32_t FLOW_IDLE_MS = 2000;
static const uint32_t SAVE_MS = 30000;
static const uint16_t DEBOUNCE_US = 400;
static const uint16_t DEFAULT_PPL = 450;
static const uint8_t EEPROM_MAGIC = 0xA7;
static const uint8_t EEPROM_VERSION = 1;

volatile uint32_t pulseCount = 0;
volatile uint32_t lastPulseUs = 0;

uint16_t pulsesPerLiter = DEFAULT_PPL;
uint32_t windowStartMs = 0;
uint32_t windowStartPulses = 0;
uint32_t previousPulses = 0;
uint32_t lastPulseSeenMs = 0;
uint32_t lastReportMs = 0;
uint32_t lastSaveMs = 0;
uint32_t savedPulses = 0;
float litersPerMinute = 0;
bool sawPulse = false;

char command[48];
uint8_t commandLength = 0;

uint32_t readPulses() {
  noInterrupts();
  uint32_t value = pulseCount;
  interrupts();
  return value;
}

void writePulses(uint32_t value) {
  noInterrupts();
  pulseCount = value;
  lastPulseUs = micros();
  interrupts();
}

void onPulse() {
  uint32_t now = micros();
  if ((uint32_t)(now - lastPulseUs) < DEBOUNCE_US) {
    return;
  }
  lastPulseUs = now;
  pulseCount++;
}

void loadStore() {
  if (EEPROM.read(0) != EEPROM_MAGIC || EEPROM.read(1) != EEPROM_VERSION) {
    pulsesPerLiter = DEFAULT_PPL;
    writePulses(0);
    return;
  }
  uint16_t stored = EEPROM.read(2) | (EEPROM.read(3) << 8);
  pulsesPerLiter = stored >= 1 ? stored : DEFAULT_PPL;
  uint32_t storedPulses = 0;
  storedPulses |= (uint32_t)EEPROM.read(4);
  storedPulses |= (uint32_t)EEPROM.read(5) << 8;
  storedPulses |= (uint32_t)EEPROM.read(6) << 16;
  storedPulses |= (uint32_t)EEPROM.read(7) << 24;
  writePulses(storedPulses);
  savedPulses = storedPulses;
}

void saveStore() {
  uint32_t pulses = readPulses();
  EEPROM.update(0, EEPROM_MAGIC);
  EEPROM.update(1, EEPROM_VERSION);
  EEPROM.update(2, pulsesPerLiter & 0xFF);
  EEPROM.update(3, (pulsesPerLiter >> 8) & 0xFF);
  EEPROM.update(4, pulses & 0xFF);
  EEPROM.update(5, (pulses >> 8) & 0xFF);
  EEPROM.update(6, (pulses >> 16) & 0xFF);
  EEPROM.update(7, (pulses >> 24) & 0xFF);
  savedPulses = pulses;
  lastSaveMs = millis();
}

bool startsWithCommand(const char* text, const char* word) {
  while (*word) {
    char left = *text;
    char right = *word;
    if (left >= 'a' && left <= 'z') {
      left = left - 'a' + 'A';
    }
    if (right >= 'a' && right <= 'z') {
      right = right - 'a' + 'A';
    }
    if (left != right) {
      return false;
    }
    text++;
    word++;
  }
  return *text == '\0' || *text == ' ';
}

void report(bool pong) {
  uint32_t pulses = readPulses();
  uint32_t ml = (uint32_t)(((uint64_t)pulses * 1000ULL) / pulsesPerLiter);
  int tenths = (int)(litersPerMinute * 10.0f + 0.5f);
  if (tenths < 0) {
    tenths = 0;
  }

  Serial.print(F("{\"ml\":"));
  Serial.print(ml);
  Serial.print(F(",\"lpm\":"));
  Serial.print(tenths / 10);
  Serial.print('.');
  Serial.print(tenths % 10);
  Serial.print(F(",\"pulses\":"));
  Serial.print(pulses);
  Serial.print(F(",\"ppl\":"));
  Serial.print(pulsesPerLiter);
  if (pong) {
    Serial.print(F(",\"pong\":1"));
  }
  Serial.print(F("}\n"));
}

void handleCommand(char* raw) {
  while (*raw == ' ') {
    raw++;
  }
  if (*raw == '\0') {
    return;
  }
  if (startsWithCommand(raw, "RESET")) {
    writePulses(0);
    litersPerMinute = 0;
    sawPulse = false;
    windowStartMs = millis();
    windowStartPulses = 0;
    previousPulses = 0;
    saveStore();
    report(false);
    return;
  }
  if (startsWithCommand(raw, "PING")) {
    report(true);
    return;
  }
  if (startsWithCommand(raw, "CAL")) {
    char* cursor = raw + 3;
    while (*cursor == ' ') {
      cursor++;
    }
    long value = atol(cursor);
    if (value >= 1 && value <= 65535) {
      pulsesPerLiter = (uint16_t)value;
      saveStore();
      report(false);
    }
  }
}

void handleSerial() {
  while (Serial.available() > 0) {
    char next = (char)Serial.read();
    if (next == '\r') {
      continue;
    }
    if (next == '\n') {
      command[commandLength] = '\0';
      handleCommand(command);
      commandLength = 0;
      continue;
    }
    if (commandLength < sizeof(command) - 1) {
      command[commandLength++] = next;
    }
  }
}

void updateFlow(uint32_t now) {
  uint32_t current = readPulses();
  if (current != previousPulses) {
    lastPulseSeenMs = now;
    previousPulses = current;
    sawPulse = true;
  }
  if (!sawPulse || (uint32_t)(now - lastPulseSeenMs) > FLOW_IDLE_MS) {
    litersPerMinute = 0;
    windowStartMs = now;
    windowStartPulses = current;
    return;
  }
  uint32_t elapsed = now - windowStartMs;
  if (elapsed >= FLOW_WINDOW_MS) {
    uint32_t delta = current - windowStartPulses;
    if (delta == 0) {
      litersPerMinute = 0;
    } else {
      litersPerMinute = (delta * 60000.0f) / (float)pulsesPerLiter / (float)elapsed;
    }
    windowStartMs = now;
    windowStartPulses = current;
  }
}

void setup() {
  pinMode(SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(SENSOR_PIN), onPulse, FALLING);
  Serial.begin(BAUD);
  loadStore();
  uint32_t now = millis();
  windowStartMs = now;
  windowStartPulses = readPulses();
  previousPulses = windowStartPulses;
  lastReportMs = now;
  lastSaveMs = now;
}

void loop() {
  handleSerial();
  uint32_t now = millis();
  updateFlow(now);
  if ((uint32_t)(now - lastReportMs) >= REPORT_MS) {
    report(false);
    lastReportMs = now;
  }
  uint32_t pulses = readPulses();
  if (pulses != savedPulses && (uint32_t)(now - lastSaveMs) >= SAVE_MS) {
    saveStore();
  }
}
