import { useEffect, useRef } from 'react';

export default function EdoPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        canvas.width = width;
        canvas.height = height;

        // Animation state
        let time = 0;
        let particles: Particle[] = [];

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            size: number;
            life: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = (Math.random() - 0.5) * 1.5;
                // Crazy Pink Palette: Hot Pink, Magenta, Deep Purple, Neon Pink
                const hue = Math.random() > 0.5 ? Math.random() * 40 + 300 : Math.random() * 20 + 340;
                this.color = `hsla(${hue}, 100%, 60%, 0.8)`;
                this.size = Math.random() * 4 + 1;
                this.life = Math.random() * 100 + 100;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.life--;

                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Mouse interaction (simple repulsion)
                // const dx = this.x - width/2;
                // const dy = this.y - height/2;
                // const dist = Math.sqrt(dx*dx + dy*dy);
                // if(dist < 200) {
                //   this.vx += dx * 0.001;
                //   this.vy += dy * 0.001;
                // }
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
            }
        }

        // Initialize particles
        for (let i = 0; i < 150; i++) {
            particles.push(new Particle());
        }

        const render = () => {
            time++;

            // Clear background with trail effect - Dark Purple/Black background
            ctx.fillStyle = 'rgba(20, 5, 20, 0.2)';
            ctx.fillRect(0, 0, width, height);

            // Update and draw particles
            particles.forEach(p => {
                p.update();
                p.draw(ctx);
            });

            // Reset shadow for text
            ctx.shadowBlur = 0;

            // Text Animation Logic
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (time < 250) {
                // Phase 1: WE ARE THE SUPERHEROES
                const scale = 1 + Math.sin(time * 0.03) * 0.05;
                ctx.font = `900 ${90 * scale}px Inter, sans-serif`;

                // Neon Pink Text
                ctx.fillStyle = '#ff00ff';
                ctx.shadowBlur = 30;
                ctx.shadowColor = '#ff00ff';

                ctx.fillText('WE ARE THE SUPERHEROES', width / 2, height / 2);

                // Subtitle
                ctx.font = '700 30px Inter, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffffff';
                ctx.fillText('CREATING THE IMPOSSIBLE', width / 2, height / 2 + 80);

            } else if (time < 350) {
                // Phase 2: Blur / Transition
                const blurAmount = (time - 250) / 2;
                // Note: ctx.filter is not supported in all browsers/contexts efficiently, 
                // but for this demo it works. Fallback is opacity.
                ctx.globalAlpha = Math.max(0, 1 - (time - 250) / 50);

                ctx.font = '900 90px Inter, sans-serif';
                ctx.fillStyle = '#ff00ff';
                ctx.shadowBlur = 50;
                ctx.shadowColor = '#ff00ff';
                ctx.fillText('WE ARE THE SUPERHEROES', width / 2, height / 2);

                ctx.globalAlpha = 1;
                ctx.filter = 'none';

            } else {
                // Phase 3: LETS GO
                const alpha = Math.min(1, (time - 350) / 60);
                ctx.globalAlpha = alpha;

                ctx.font = '900 140px Inter, sans-serif';

                // Crazy Pink Gradient
                const gradient = ctx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, '#ec4899'); // Pink 500
                gradient.addColorStop(0.5, '#d946ef'); // Fuchsia 500
                gradient.addColorStop(1, '#a855f7'); // Purple 500
                ctx.fillStyle = gradient;

                ctx.shadowBlur = 40;
                ctx.shadowColor = '#d946ef';

                ctx.fillText('LETS GO', width / 2, height / 2 - 60);

                ctx.shadowBlur = 0;

                // Professional Subtext
                ctx.font = '300 36px Inter, sans-serif';
                ctx.fillStyle = '#e2e8f0';
                // letterSpacing is not a direct CanvasRenderingContext2D property.
                // It would require measuring text and drawing character by character.
                // For this example, we'll omit it to keep it syntactically correct for canvas.
                ctx.fillText('THINK LIKE A DESIGNER', width / 2, height / 2 + 60);

                ctx.font = '600 36px Inter, sans-serif';
                ctx.fillStyle = '#f472b6'; // Pink 400
                ctx.fillText('UI EXPERT', width / 2, height / 2 + 110);

                ctx.globalAlpha = 1;
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0f172a', zIndex: 1000 }}>
            <canvas ref={canvasRef} />
            <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 1001 }}>
                <a href="/" style={{ color: '#fff', textDecoration: 'none', opacity: 0.5, fontSize: '0.9rem' }}>Back to Engine &rarr;</a>
            </div>
        </div>
    );
}
