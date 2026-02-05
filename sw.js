// ============================================
// 연애 동물 테스트 - Service Worker v1
// ============================================
var CACHE_NAME = 'love-animal-v2';
var CACHE_URLS = [
  '/',
  '/index.html'
];

// 설치: 핵심 리소스 캐시
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
});

// 활성화: 오래된 캐시 정리 + 알림 체크
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
        .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 네트워크 요청: 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', function(event) {
  // API 요청은 캐시하지 않음
  if (event.request.url.includes('supabase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('stripe')) {
    return;
  }
  
  event.waitUntil(
    fetch(event.request).then(function(response) {
      // 성공하면 캐시 업데이트
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
  
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

// 메시지 수신 (메인 페이지에서 알림 예약)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    var delay = event.data.delay || 86400000; // 기본 24시간
    var data = event.data.notification;
    
    setTimeout(function() {
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || 'https://raw.githubusercontent.com/mananim0628-source/love-animal-test/main/wolf_main.png',
        badge: data.icon || 'https://raw.githubusercontent.com/mananim0628-source/love-animal-test/main/wolf_main.png',
        tag: data.tag || 'love-animal-reminder',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200],
        actions: [
          { action: 'open', title: '확인하기 💕' },
          { action: 'close', title: '나중에' }
        ]
      });
    }, delay);
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  var url = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(function(clients) {
      // 이미 열린 탭이 있으면 포커스
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.includes('love-animal-test') && 'focus' in clients[i]) {
          return clients[i].focus();
        }
      }
      // 없으면 새 탭
      return self.clients.openWindow(url);
    })
  );
});
