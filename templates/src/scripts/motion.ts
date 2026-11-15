// Shared motion for every client site: Lenis smooth scroll + Motion reveals.
// Rules (playbook §6): transform/opacity only, one hero moment, reduced-motion respected,
// content stays visible if this script never runs (see the safety timer in Base.astro).
import Lenis from 'lenis';
import { animate } from 'motion/mini';
import { inView, scroll } from 'motion';

(window as any).__motion = true;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = [0.22, 1, 0.36, 1] as const;

if (!reduce) {
  const lenis = new Lenis({ autoRaf: true, lerp: 0.12 });

  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')!;
      if (id.length < 2) return;
      const target = document.querySelector<HTMLElement>(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -16 });
    });
  });

  // One orchestrated hero moment.
  document.querySelectorAll<HTMLElement>('[data-hero]').forEach((el, i) => {
    animate(el, { opacity: [0, 1], transform: ['translateY(28px)', 'none'] }, { duration: 0.9, delay: 0.1 + i * 0.09, ease: ease as any });
  });

  // Quiet reveals on key blocks only.
  inView(
    '[data-reveal]',
    (el) => {
      animate(el as HTMLElement, { opacity: [0, 1], transform: ['translateY(32px)', 'none'] }, { duration: 0.8, ease: ease as any });
    },
    { margin: '0px 0px -12% 0px' },
  );

  // Subtle hero parallax (≤ 8%).
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    scroll((progress: number) => { el.style.transform = `translate3d(0, ${(progress * 8).toFixed(2)}%, 0)`; }, {
      target: el.parentElement ?? el,
      offset: ['start start', 'end start'],
    });
  });
} else {
  document.documentElement.classList.remove('js');
}

// "Open now" badge, computed in the business's own time zone.
document.querySelectorAll<HTMLElement>('[data-open-status]').forEach((el) => {
  try {
    const tz = el.dataset.tz!;
    const hours = JSON.parse(el.dataset.hours!) as Record<string, [string, string]>;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const day = parts.find((p) => p.type === 'weekday')!.value.toLowerCase().slice(0, 3);
    const now = `${parts.find((p) => p.type === 'hour')!.value}:${parts.find((p) => p.type === 'minute')!.value}`;
    const today = hours[day];
    const open = !!today && now >= today[0] && now < today[1];
    el.textContent = open ? 'Open now' : 'Closed now';
    el.dataset.state = open ? 'open' : 'closed';
    el.hidden = false;
    // Highlight today's row in the hours table.
    document.querySelector(`[data-day="${day}"]`)?.setAttribute('data-today', '');
  } catch {
    /* leave hidden if anything is off — never show a wrong status */
  }
});
