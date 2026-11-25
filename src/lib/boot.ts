// The inline head script that paints the first frame (theme + time-of-day backdrop). Public pages inline it;
// the internal portal serves the same text from /boot.js because its CSP forbids inline scripts.
export function bootScript(photoMap: Record<string, { f: string; alt: string }>): string {
  return `(function(){
  var d=document.documentElement,P=${JSON.stringify(photoMap)};
  function period(){var h=new Date().getHours();return h>=5&&h<11?'morning':h>=11&&h<18?'midday':'night';}
  try{
    var q=new URLSearchParams(location.search).get('theme');
    var t=(q==='dark'||q==='light')?q:localStorage.getItem('hl-theme');
    if(t!=='dark'&&t!=='light')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
    d.setAttribute('data-theme',t);
  }catch(e){d.setAttribute('data-theme','dark');}
  d.classList.add('js');
  var cur=period();d.setAttribute('data-period',cur);
  function put(layer,p,first){
    var imgs=layer.querySelectorAll('img'),on=layer.querySelector('img.on'),n=(on&&on===imgs[0])?imgs[1]:imgs[0],blur=layer.hasAttribute('data-blur'),f=P[p].f;
    n.srcset=blur?(f+'-1200.jpg 1200w'):(f+'-1200.jpg 1200w, '+f+'-2400.jpg 2400w');n.sizes='100vw';n.src=f+'-1200.jpg';
    n.alt=blur?'':P[p].alt;n.setAttribute('aria-hidden',blur?'true':'false');
    var show=function(){n.classList.add('on');if(on&&on!==n){on.classList.remove('on');on.setAttribute('aria-hidden','true');}};
    if(first){show();}else if(n.decode){n.decode().then(show,show);}else{n.onload=show;}
  }
  function apply(p,first){document.querySelectorAll('[data-bd]').forEach(function(l){put(l,p,first);});}
  window.hlBackdrop={init:function(){apply(cur,true);},
    tick:function(){var p=period();if(p!==cur){cur=p;d.setAttribute('data-period',p);apply(p,false);}}};
})();`;
}
