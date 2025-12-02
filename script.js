// ============================================
// PARTICLE NETWORK BACKGROUND
// ============================================
(function() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles = [];
    const particleCount = 60;
    const connectionDistance = 300;
    const disconnectDistance = 400; // Stretch further before snapping
    const connections = new Map(); // Track connection state for smooth animations
    const particleSpeed = 0.3;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = document.documentElement.scrollHeight;
    }

    function createParticles() {
        particles = [];
        const minSpacing = 200; // Minimum distance between node centers

        for (let i = 0; i < particleCount; i++) {
            // Interpolate between purple (#8b5cf6) and blue (#3b82f6), dimmed
            const t = Math.random();
            const r = Math.round((139 + (59 - 139) * t) * 0.20);
            const g = Math.round((92 + (130 - 92) * t) * 0.20);
            const b = Math.round((246 + (246 - 246) * t) * 0.20);

            // Try to find a position that doesn't overlap too much
            let x, y, attempts = 0;
            const maxAttempts = 50;

            do {
                x = Math.random() * canvas.width;
                y = Math.random() * canvas.height;
                attempts++;

                // Check distance from existing particles
                let tooClose = false;
                for (const p of particles) {
                    const dx = p.x - x;
                    const dy = p.y - y;
                    if (Math.sqrt(dx * dx + dy * dy) < minSpacing) {
                        tooClose = true;
                        break;
                    }
                }

                if (!tooClose) break;
            } while (attempts < maxAttempts);

            particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * particleSpeed,
                vy: (Math.random() - 0.5) * particleSpeed,
                radius: Math.random() * 120 + 60,
                color: `rgb(${r}, ${g}, ${b})`
            });
        }
    }

    function initConnections() {
        connections.clear();
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    connections.set(`${i}-${j}`, { progress: 1 });
                }
            }
        }
    }

    function drawConnections() {
        const lerpSpeed = 0.08; // Gradual
        const snapThreshold = 0.01;

        // Check all particle pairs
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const p1 = particles[i];
                const p2 = particles[j];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;

                // Quick bounds check
                if (Math.abs(dx) > disconnectDistance || Math.abs(dy) > disconnectDistance) {
                    continue;
                }

                const dist = Math.sqrt(dx * dx + dy * dy);
                const key = `${i}-${j}`;

                let conn = connections.get(key);

                // Form new connections at connectionDistance
                // Break existing connections at disconnectDistance (hysteresis)
                const shouldConnect = dist < connectionDistance;
                const shouldDisconnect = dist > disconnectDistance;

                if (shouldConnect) {
                    if (!conn) {
                        conn = { progress: 0 };
                        connections.set(key, conn);
                    }
                    conn.progress += (1 - conn.progress) * lerpSpeed;
                } else if (conn) {
                    if (shouldDisconnect) {
                        conn.progress += (0 - conn.progress) * lerpSpeed;
                        if (conn.progress < snapThreshold) {
                            connections.delete(key);
                            continue;
                        }
                    } else {
                        // In between: maintain but fade based on distance
                        const fadeTarget = 1 - (dist - connectionDistance) / (disconnectDistance - connectionDistance);
                        conn.progress += (fadeTarget - conn.progress) * lerpSpeed;
                    }
                }

                if (!conn || conn.progress < snapThreshold) continue;

                // Draw the gum strand
                drawGumStrand(p1, p2, conn.progress, dist);
            }
        }
    }

    function drawGumStrand(p1, p2, progress, dist) {
        // Simple line with gradient
        const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        gradient.addColorStop(0, p1.color);
        gradient.addColorStop(1, p2.color);

        // Gradual fade in/out
        let opacity;
        if (dist < connectionDistance) {
            // Within range: gradual fade in
            opacity = progress;
        } else {
            // Beyond range: gradual fade out based on distance
            const fadeProgress = (dist - connectionDistance) / (disconnectDistance - connectionDistance);
            opacity = Math.pow(1 - fadeProgress, 2); // Ease out
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 30;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update positions
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges (only when fully off screen)
            if (p.x < -p.radius) p.x = canvas.width + p.radius;
            if (p.x > canvas.width + p.radius) p.x = -p.radius;
            if (p.y < -p.radius) p.y = canvas.height + p.radius;
            if (p.y > canvas.height + p.radius) p.y = -p.radius;
        });

        // Draw connections (gum strands) - before nodes so they appear behind
        drawConnections();

        // Draw nodes
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        resize();
        createParticles();
        initConnections();
    });

    resize();
    createParticles();
    initConnections();
    animate();
})();

// ============================================
// SCROLL ANIMATIONS
// ============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ============================================
// SMOOTH SCROLL
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============================================
// WAITLIST FORM
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz3Uehjn3xMa37_kbZnxwHv51iGrT557BrIeRQFg5k5v2AHp6YHNtB8QaF1OXa19a1y/exec';

document.getElementById('waitlist-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const message = document.getElementById('form-message');
    const button = e.target.querySelector('button');

    button.disabled = true;
    button.textContent = 'Joining...';

    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('timestamp', new Date().toISOString());

        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });

        message.textContent = "You're on the list! We'll be in touch soon.";
        message.className = 'mt-4 text-sm text-green-400';
        document.getElementById('email').value = '';
    } catch (error) {
        message.textContent = 'Something went wrong. Please try again.';
        message.className = 'mt-4 text-sm text-red-400';
    }

    button.disabled = false;
    button.textContent = 'Join Waitlist';
});
