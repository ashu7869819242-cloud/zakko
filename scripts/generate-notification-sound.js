/**
 * Notification Sound Generator
 *
 * Run with: node scripts/generate-notification-sound.js
 *
 * Creates a short notification chime WAV file at public/notification.mp3
 * Uses raw PCM data to create a pleasant two-tone chime.
 */

const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const DURATION = 0.4; // seconds
const SAMPLES = Math.floor(SAMPLE_RATE * DURATION);

// Generate a pleasant two-tone chime
function generateChime() {
    const buffer = new Float32Array(SAMPLES);

    for (let i = 0; i < SAMPLES; i++) {
        const t = i / SAMPLE_RATE;
        // Two harmonious frequencies (C5 + E5)
        const tone1 = Math.sin(2 * Math.PI * 523.25 * t) * 0.5;
        const tone2 = Math.sin(2 * Math.PI * 659.25 * t) * 0.3;
        // Envelope: quick attack, smooth decay
        const envelope = Math.exp(-t * 6) * Math.min(t * 100, 1);
        buffer[i] = (tone1 + tone2) * envelope;
    }
    return buffer;
}

// Convert to 16-bit WAV
function float32ToWav(samples) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = samples.length * (bitsPerSample / 8);

    const buffer = Buffer.alloc(44 + dataSize);

    // WAV header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    // PCM data
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        buffer.writeInt16LE(Math.floor(s * 32767), 44 + i * 2);
    }

    return buffer;
}

const samples = generateChime();
const wav = float32ToWav(samples);

const outPath = path.join(__dirname, "..", "public", "notification.mp3");
fs.writeFileSync(outPath, wav);
console.log(`✅ Generated notification sound at ${outPath} (${wav.length} bytes)`);
