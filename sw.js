// かなみち 서비스 워커: 앱 페이지(index.html)만 다룬다.
// 늘 인터넷에서 새로 받되(업데이트가 바로 반영됨), 실패하거나 GitHub가 접속을 막으면(429) 마지막으로 받은 페이지로 연다.
const C='kanamichi-page';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET'||r.mode!=='navigate') return;
  e.respondWith((async()=>{
    const c=await caches.open(C), key=new URL('./',self.registration.scope).href;
    try{ const res=await fetch(r);
      if(res.ok){ c.put(key,res.clone()); return res; }
      return (await c.match(key))||res;
    }catch(err){ const hit=await c.match(key); if(hit) return hit; throw err; }
  })());
});
