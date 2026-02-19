// Proven Results JavaScript - Video play controls

function initVideoPlayControls(wrapper) {
  if (!wrapper) return;

  const items = Array.from(wrapper.querySelectorAll('[data-video-item]'));
  if (!items.length) return;

  const videos = items
    .map(item => item.querySelector('video'))
    .filter(Boolean);

  items.forEach((item) => {
    const video = item.querySelector('video');
    const playButton = item.querySelector('[data-video-play-button]');

    if (!video || !playButton) return;

    const togglePlay = () => {
      // Pause all other videos in this wrapper
      videos.forEach((v) => {
        if (v !== video) {
          v.pause();
          const parentItem = v.closest('[data-video-item]');
          if (parentItem) {
            parentItem.classList.remove('is-playing');
          }
        }
      });

      if (video.paused) {
        video.play().catch(() => {});
        item.classList.add('is-playing');
      } else {
        video.pause();
        item.classList.remove('is-playing');
      }
    };

    playButton.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);

    video.addEventListener('ended', () => {
      item.classList.remove('is-playing');
    });
  });
}

class TestimonialSlider {
  constructor(container) {
    this.container = container;
    this.track = container.querySelector('[data-testimonial-track]');
    this.slides = container.querySelectorAll('[data-testimonial-slide]');
    this.dots = container.querySelectorAll('[data-slide-index]');
    this.prevBtn = container.querySelector('[data-slider-prev]');
    this.nextBtn = container.querySelector('[data-slider-next]');
    
    this.currentSlide = 0;
    this.slideCount = this.slides.length;
    this.autoplayInterval = null;
    
    this.init();
  }

  init() {
    this.updateSlides();
    this.addEventListeners();
    
    if (this.slideCount > 1) {
      this.startAutoplay();
    }
  }

  addEventListeners() {
    this.prevBtn.addEventListener('click', () => {
      this.prev();
      this.resetAutoplay();
    });
    
    this.nextBtn.addEventListener('click', () => {
      this.next();
      this.resetAutoplay();
    });
    
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.goToSlide(index);
        this.resetAutoplay();
      });
    });

    // Pause autoplay on hover
    this.container.addEventListener('mouseenter', () => this.stopAutoplay());
    this.container.addEventListener('mouseleave', () => this.startAutoplay());
    
    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.prev();
        this.resetAutoplay();
      } else if (e.key === 'ArrowRight') {
        this.next();
        this.resetAutoplay();
      }
    });
  }

  updateSlides() {
    // Update track position
    this.track.style.transform = `translateX(-${this.currentSlide * 100}%)`;
    
    // Update active classes
    this.slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === this.currentSlide);
      slide.setAttribute('aria-hidden', index !== this.currentSlide);
    });
    
    // Update dots
    this.dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === this.currentSlide);
      dot.setAttribute('aria-current', index === this.currentSlide ? 'true' : 'false');
    });
    
    // Update button states
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentSlide === 0;
      this.prevBtn.style.opacity = this.currentSlide === 0 ? '0.3' : '1';
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentSlide === this.slideCount - 1;
      this.nextBtn.style.opacity = this.currentSlide === this.slideCount - 1 ? '0.3' : '1';
    }
  }

  next() {
    if (this.currentSlide < this.slideCount - 1) {
      this.currentSlide++;
    } else {
      this.currentSlide = 0; // Loop
    }
    this.updateSlides();
  }

  prev() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
    } else {
      this.currentSlide = this.slideCount - 1; // Loop
    }
    this.updateSlides();
  }

  goToSlide(index) {
    this.currentSlide = index;
    this.updateSlides();
  }

  startAutoplay() {
    if (this.slideCount <= 1) return;
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => this.next(), 6000);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  resetAutoplay() {
    this.stopAutoplay();
    this.startAutoplay();
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}

function initComponents() {
  // Initialize video play controls
  document.querySelectorAll('[data-video-comparison]').forEach(container => {
    const comparisonContainer = container.querySelector('.video-comparison-container');
    if (comparisonContainer) {
      initVideoPlayControls(comparisonContainer);
    }
  });
  
  // Initialize testimonial sliders
  document.querySelectorAll('[data-testimonial-slider]').forEach(slider => {
    new TestimonialSlider(slider);
  });
}

// Re-initialize on Shopify section load
document.addEventListener('shopify:section:load', (event) => {
  const section = event.target;
  
  const videoComparison = section.querySelector('[data-video-comparison]');
  if (videoComparison) {
    const comparisonContainer = videoComparison.querySelector('.video-comparison-container');
    if (comparisonContainer) {
      initVideoPlayControls(comparisonContainer);
    }
  }
  
  const testimonialSlider = section.querySelector('[data-testimonial-slider]');
  if (testimonialSlider) {
    new TestimonialSlider(testimonialSlider);
  }
});

// Re-initialize on Shopify section select (preview mode)
document.addEventListener('shopify:section:select', (event) => {
  const section = event.target;
  
  const videoComparison = section.querySelector('[data-video-comparison]');
  if (videoComparison) {
    const comparisonContainer = videoComparison.querySelector('.video-comparison-container');
    if (comparisonContainer) {
      initVideoPlayControls(comparisonContainer);
    }
  }
});
