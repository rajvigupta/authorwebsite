import { useEffect, useRef, useState } from 'react';

type Page = {
  x: number;
  y: number;
  rotation: number;
  speed: number;
  opacity: number;
  size: number;
};

export function FloatingPages() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    const pages: Page[] = [];
    
    // FULL SCREEN: Pages distributed across entire width
    const pageCount = isMobile ? 15 : 30; // More pages since we have full width
    const verticalSpacing = isMobile ? 300 : 250;
    const horizontalSpacing = isMobile ? 150 : 200; // Space between columns
    const columnsCount = Math.ceil(canvas.width / horizontalSpacing);
    const pagesPerColumn = Math.ceil(canvas.height / verticalSpacing) + 2;

    // Create pages in a grid pattern across full screen
    for (let col = 0; col < columnsCount; col++) {
      for (let p = 0; p < pagesPerColumn; p++) {
        const x = col * horizontalSpacing + (Math.random() - 0.5) * 50;
        const y = p * verticalSpacing + (Math.random() - 0.5) * 80;

        pages.push({
          x,
          y,
          rotation: (Math.random() - 0.5) * 30, // Random tilt
          speed: 0.3 + Math.random() * 0.4,
          opacity: isMobile ? 0.02 : 0.03 + Math.random() * 0.03, // Very subtle
          size: isMobile ? 50 : 70 + Math.random() * 40,
        });
      }
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
    };

    window.addEventListener('resize', handleResize);

    let animationId: number;
    let lastTime = performance.now();
    const targetFPS = isMobile ? 30 : 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;
      
      // Frame throttling for mobile
      if (deltaTime < frameInterval) return;
      
      lastTime = currentTime - (deltaTime % frameInterval);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pages.forEach((page) => {
        // Smooth upward movement
        page.y -= page.speed;

        // Gentle rotation
        page.rotation += 0.05;

        // Subtle horizontal sway
        const swayOffset = Math.sin(page.y * 0.008) * (isMobile ? 8 : 12);
        const currentX = page.x + swayOffset;

        // Reset when page goes off top
        if (page.y + page.size < -100) {
          page.y = canvas.height + 100;
          page.x = Math.random() * canvas.width;
        }

        // Draw page
        ctx.save();
        ctx.translate(currentX, page.y);
        ctx.rotate((page.rotation * Math.PI) / 180);

        // Shadow
        ctx.fillStyle = `rgba(0, 0, 0, ${page.opacity * 0.3})`;
        ctx.fillRect(-page.size / 2 + 3, -page.size / 2 + 3, page.size * 0.7, page.size);

        // Page background with gradient (only on desktop for performance)
        if (isMobile) {
          ctx.fillStyle = `rgba(250, 248, 243, ${page.opacity})`;
        } else {
          const gradient = ctx.createLinearGradient(
            -page.size / 2, 
            -page.size / 2, 
            page.size / 2, 
            page.size / 2
          );
          gradient.addColorStop(0, `rgba(250, 248, 243, ${page.opacity})`);
          gradient.addColorStop(1, `rgba(232, 228, 218, ${page.opacity * 0.8})`);
          ctx.fillStyle = gradient;
        }
        
        ctx.fillRect(-page.size / 2, -page.size / 2, page.size * 0.7, page.size);

        // Text lines (fewer on mobile)
        const lineCount = isMobile ? 3 : 6;
        ctx.strokeStyle = `rgba(201, 166, 58, ${page.opacity * 0.5})`;
        ctx.lineWidth = 0.6;
        
        for (let i = 0; i < lineCount; i++) {
          const lineY = -page.size / 2 + 12 + i * (page.size / 10);
          ctx.beginPath();
          ctx.moveTo(-page.size / 2 + 8, lineY);
          ctx.lineTo(-page.size / 2 + page.size * 0.55, lineY);
          ctx.stroke();
        }

        // Page border
        ctx.strokeStyle = `rgba(201, 166, 58, ${page.opacity * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-page.size / 2, -page.size / 2, page.size * 0.7, page.size);

        // Folded corner
        const cornerSize = isMobile ? 10 : 15;
        ctx.beginPath();
        ctx.moveTo(page.size * 0.2, -page.size / 2);
        ctx.lineTo(page.size * 0.2, -page.size / 2 + cornerSize);
        ctx.lineTo(page.size * 0.2 - cornerSize, -page.size / 2);
        ctx.closePath();
        
        const cornerGradient = ctx.createLinearGradient(
          page.size * 0.2 - cornerSize,
          -page.size / 2,
          page.size * 0.2,
          -page.size / 2 + cornerSize
        );
        cornerGradient.addColorStop(0, `rgba(212, 175, 55, ${page.opacity * 0.8})`);
        cornerGradient.addColorStop(1, `rgba(201, 166, 58, ${page.opacity * 0.6})`);
        
        ctx.fillStyle = cornerGradient;
        ctx.fill();

        ctx.restore();
      });
    };

    animate(performance.now());

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [isMobile]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }} // BEHIND EVERYTHING - changed from 1 to 0
    />
  );
}