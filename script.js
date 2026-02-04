// ============================================
// PARTICLE NETWORK BACKGROUND
// ============================================
(function() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mobile detection and scaling
    const isMobile = () => window.innerWidth < 768;
    const getScale = () => isMobile() ? 0.6 : 1;

    let particles = [];
    // Fewer particles on mobile for performance
    const getParticleCount = () => isMobile() ? 25 : 60;
    const baseConnectionDistance = 300;
    const baseDisconnectDistance = 400;
    let connectionDistance = baseConnectionDistance;
    let disconnectDistance = baseDisconnectDistance;
    const connections = new Map();
    // Slower on mobile for smoother animation
    const getParticleSpeed = () => isMobile() ? 0.15 : 0.3;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = document.documentElement.scrollHeight;
        // Update connection distances based on screen size
        const scale = getScale();
        connectionDistance = baseConnectionDistance * scale;
        disconnectDistance = baseDisconnectDistance * scale;
    }

    function createParticles() {
        particles = [];
        const scale = getScale();
        const count = getParticleCount();
        const minSpacing = 200 * scale;
        const baseRadius = 120 * scale;
        const minRadius = 60 * scale;

        for (let i = 0; i < count; i++) {
            // Purple tones only (#8b5cf6), dimmed with slight variation
            const variation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
            const r = Math.round(139 * 0.18 * variation);
            const g = Math.round(92 * 0.18 * variation);
            const b = Math.round(246 * 0.18 * variation);

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

            const speed = getParticleSpeed();
            particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                radius: Math.random() * baseRadius + minRadius,
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
        ctx.lineWidth = isMobile() ? 15 : 30;
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
// MOBILE MENU
// ============================================
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    const mobileNavLinks = mobileMenu.querySelectorAll('.mobile-nav-link');

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Handle link clicks - set active state and close menu
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active from all links
            mobileNavLinks.forEach(l => l.classList.remove('active'));
            // Add active to clicked link
            link.classList.add('active');
            // Close menu
            mobileMenu.classList.add('hidden');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });
}

