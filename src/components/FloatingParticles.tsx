import { useEffect } from 'react';

export const FloatingParticles = () => {
  useEffect(() => {
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (6 + Math.random() * 4) + 's';
      
      const container = document.querySelector('.floating-particles');
      if (container) {
        container.appendChild(particle);
        
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 10000);
      }
    };

    const interval = setInterval(createParticle, 500);
    
    return () => clearInterval(interval);
  }, []);

  return <div className="floating-particles" />;
};