/**
 * AETHER - Liquid Glass Visualizer & Fluid Physics
 * High-performance Canvas animation simulating organic fluid refraction,
 * audio-reactive viscoelastic metablob, floating droplets, and specular glass highlights.
 */

class LiquidGlassVisualizer {
    constructor(canvasId, audioEngine) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.audio = audioEngine;

        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;

        // Visualizer Physics
        this.numPoints = 64; // High-resolution fluid contour
        this.baseRadius = 110;
        this.points = [];
        this.springStiffness = 0.055;
        this.damping = 0.88;
        this.rotationAngle = 0;

        // Floating liquid droplets
        this.droplets = [];
        this.maxDroplets = 24;

        // Audio analysis buffers
        this.freqData = new Uint8Array(256);
        this.timeData = new Uint8Array(256);

        // Ambient background fluid blobs
        this.ambientBlobs = [
            { x: 0.2, y: 0.3, r: 240, vx: 0.0003, vy: 0.0004, color: 'rgba(56, 92, 145, 0.22)' },
            { x: 0.8, y: 0.7, r: 280, vx: -0.0002, vy: -0.0003, color: 'rgba(164, 118, 72, 0.18)' },
            { x: 0.5, y: 0.8, r: 220, vx: 0.0002, vy: -0.0002, color: 'rgba(88, 48, 120, 0.15)' }
        ];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Initialize spring points around circumference
        for (let i = 0; i < this.numPoints; i++) {
            const angle = (i / this.numPoints) * Math.PI * 2;
            this.points.push({
                angle: angle,
                baseRadius: this.baseRadius,
                currentRadius: this.baseRadius,
                targetRadius: this.baseRadius,
                velocity: 0
            });
        }

        // Initialize droplets
        for (let i = 0; i < this.maxDroplets; i++) {
            this.resetDroplet(i, true);
        }

        this.animate();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);

        this.baseRadius = Math.min(this.width, this.height) * 0.26;
        if (this.points) {
            this.points.forEach(p => {
                p.baseRadius = this.baseRadius;
            });
        }
    }

    resetDroplet(index, initial = false) {
        const angle = Math.random() * Math.PI * 2;
        const dist = initial ? (this.baseRadius * 0.8 + Math.random() * 80) : this.baseRadius * 0.9;
        this.droplets[index] = {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.5 - Math.random() * 0.9,
            r: 3 + Math.random() * 6,
            alpha: 0.2 + Math.random() * 0.6,
            life: initial ? Math.random() * 100 : 100
        };
    }

    /**
     * Main animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        // Read audio spectrum if available
        let bassEnergy = 0;
        let midEnergy = 0;
        let highEnergy = 0;

        if (this.audio && this.audio.analyser && this.audio.isPlaying) {
            this.audio.analyser.getByteFrequencyData(this.freqData);
            this.audio.analyser.getByteTimeDomainData(this.timeData);

            // Compute energy bands with adaptive scaling for comfortable volume levels
            for (let i = 0; i < 8; i++) bassEnergy += this.freqData[i];
            bassEnergy = Math.min(1.0, (bassEnergy / (8 * 255)) * 2.2);

            for (let i = 8; i < 48; i++) midEnergy += this.freqData[i];
            midEnergy = Math.min(1.0, (midEnergy / (40 * 255)) * 2.0);

            for (let i = 48; i < 128; i++) highEnergy += this.freqData[i];
            highEnergy = Math.min(1.0, (highEnergy / (80 * 255)) * 1.8);
        }

        this.render(bassEnergy, midEnergy, highEnergy);
    }

    render(bass, mid, high) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // 1. Draw subtle ambient fluid background
        this.drawAmbientGlow(ctx, bass);

        // 2. Physics update for the liquid orb contour
        this.rotationAngle += 0.003 + bass * 0.01;

        const time = performance.now() * 0.001;
        const bassImpact = bass * 45;

        for (let i = 0; i < this.numPoints; i++) {
            const p = this.points[i];
            
            // Perlin-like organic ripple formula
            const wave1 = Math.sin(p.angle * 3 + time * 1.8) * (8 + bassImpact * 0.7);
            const wave2 = Math.cos(p.angle * 5 - time * 2.2) * (5 + mid * 20);
            const wave3 = Math.sin(p.angle * 8 + time * 3.5) * (3 + high * 15);

            p.targetRadius = p.baseRadius + wave1 + wave2 + wave3 + (bassImpact * 0.5);

            // Hooke's Law Spring Physics: F = -k * x - c * v
            const displacement = p.targetRadius - p.currentRadius;
            p.velocity += displacement * this.springStiffness;
            p.velocity *= this.damping;
            p.currentRadius += p.velocity;
        }

        // 3. Render Liquid Glass Core
        ctx.save();
        ctx.translate(centerX, centerY);

        // Render floating droplets behind
        this.renderDroplets(ctx, bass);

        // Construct fluid path
        ctx.beginPath();
        const firstPoint = this.getPointCoord(0);
        ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 0; i < this.numPoints; i++) {
            const pCurrent = this.getPointCoord(i);
            const pNext = this.getPointCoord((i + 1) % this.numPoints);
            // Smooth Catmull-Rom or Quadratic bezier through midpoint
            const midX = (pCurrent.x + pNext.x) / 2;
            const midY = (pCurrent.y + pNext.y) / 2;
            ctx.quadraticCurveTo(pCurrent.x, pCurrent.y, midX, midY);
        }
        ctx.closePath();

        // Fluid Glass Radial Refraction Fill
        const fluidGrad = ctx.createRadialGradient(
            -this.baseRadius * 0.25, -this.baseRadius * 0.35, this.baseRadius * 0.05,
            0, 0, this.baseRadius * 1.35
        );
        fluidGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.45)');   // Specular refraction peak
        fluidGrad.addColorStop(0.18, 'rgba(195, 220, 245, 0.28)'); // Translucent glass cyan
        fluidGrad.addColorStop(0.45, 'rgba(110, 145, 185, 0.16)'); // Deep smoked blue
        fluidGrad.addColorStop(0.75, 'rgba(32, 42, 60, 0.32)');    // Obsidian glass body
        fluidGrad.addColorStop(1.0, 'rgba(12, 16, 26, 0.65)');     // Dark glass rim

        ctx.fillStyle = fluidGrad;
        ctx.shadowColor = 'rgba(120, 180, 255, 0.28)';
        ctx.shadowBlur = 35 + bass * 40;
        ctx.fill();

        // Inner Caustic Ring (liquid membrane highlight)
        ctx.lineWidth = 1.8;
        const rimGrad = ctx.createLinearGradient(
            -this.baseRadius, -this.baseRadius,
            this.baseRadius, this.baseRadius
        );
        rimGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)'); // Top-left light catch
        rimGrad.addColorStop(0.35, 'rgba(210, 230, 255, 0.45)');
        rimGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
        rimGrad.addColorStop(1.0, 'rgba(180, 210, 255, 0.65)'); // Bottom-right bounce light

        ctx.strokeStyle = rimGrad;
        ctx.stroke();

        // 4. Glossy Specular Glass Reflection on Top Edge
        this.renderGlassGlint(ctx);

        ctx.restore();
    }

    getPointCoord(index) {
        const p = this.points[index];
        const angle = p.angle + this.rotationAngle;
        return {
            x: Math.cos(angle) * p.currentRadius,
            y: Math.sin(angle) * p.currentRadius
        };
    }

    /**
     * Glossy curved glass reflection (mimicking curved polished liquid surface)
     */
    renderGlassGlint(ctx) {
        ctx.save();
        ctx.beginPath();
        const r = this.baseRadius * 0.72;
        ctx.ellipse(-r * 0.15, -r * 0.42, r * 0.55, r * 0.24, -Math.PI / 8, 0, Math.PI * 2);
        
        const glintGrad = ctx.createLinearGradient(
            -r * 0.4, -r * 0.6,
            0, -r * 0.2
        );
        glintGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        glintGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

        ctx.fillStyle = glintGrad;
        ctx.fill();
        ctx.restore();
    }

    /**
     * Floating liquid droplets orbiting with viscoelastic physics
     */
    renderDroplets(ctx, bass) {
        for (let i = 0; i < this.maxDroplets; i++) {
            const d = this.droplets[i];

            d.x += d.vx;
            d.y += d.vy;
            d.life -= 0.6 + bass * 1.5;

            // Upward buoyant drift
            if (d.life <= 0 || Math.abs(d.x) > this.width * 0.45 || Math.abs(d.y) > this.height * 0.45) {
                this.resetDroplet(i);
                continue;
            }

            const currentAlpha = d.alpha * (d.life / 100);

            ctx.save();
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);

            const dropGrad = ctx.createRadialGradient(
                d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.1,
                d.x, d.y, d.r
            );
            dropGrad.addColorStop(0, `rgba(255, 255, 255, ${currentAlpha})`);
            dropGrad.addColorStop(0.5, `rgba(180, 215, 245, ${currentAlpha * 0.7})`);
            dropGrad.addColorStop(1, `rgba(40, 60, 90, ${currentAlpha * 0.2})`);

            ctx.fillStyle = dropGrad;
            ctx.fill();

            // Tiny glass rim
            ctx.strokeStyle = `rgba(255, 255, 255, ${currentAlpha * 0.8})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();

            ctx.restore();
        }
    }

    /**
     * Organic ambient illumination in background
     */
    drawAmbientGlow(ctx, bass) {
        this.ambientBlobs.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;

            if (b.x < 0.1 || b.x > 0.9) b.vx *= -1;
            if (b.y < 0.1 || b.y > 0.9) b.vy *= -1;

            const px = b.x * this.width;
            const py = b.y * this.height;
            const radius = b.r * (1 + bass * 0.25);

            const g = ctx.createRadialGradient(px, py, 10, px, py, radius);
            g.addColorStop(0, b.color);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = g;
            ctx.fillRect(0, 0, this.width, this.height);
        });
    }
}

window.LiquidGlassVisualizer = LiquidGlassVisualizer;
