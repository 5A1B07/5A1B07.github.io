this.addEventListener("install", function (event) {
	console.log("installing");
	// event.waitUntil(
	// 	caches.open('v1').then(function (cache) {
	// 		return cache.addAll([
	// 			'/sw-test/',
	// 			'/sw-test/index.html',
	// 			'/sw-test/style.css',
	// 			'/sw-test/app.js',
	// 			'/sw-test/image-list.js',
	// 			'/sw-test/star-wars-logo.jpg',
	// 			'/sw-test/gallery/bountyHunters.jpg',
	// 			'/sw-test/gallery/myLittleVader.jpg',
	// 			'/sw-test/gallery/snowTroopers.jpg'
	// 		]);
	// 	})
	// );
});

this.addEventListener("activate", function (event) {
	/* purge all caches */
	event.waitUntil(
		caches.keys().then(function (cacheNames) {
			return Promise.all(
				cacheNames.map(function (cacheName) {
					console.log("purging cache: ", cacheName);
					return caches.delete(cacheName);
				})
			);
		})
	);
});

this.addEventListener("fetch", function (event) {
	console.log("Handling fetch event for", event.request.url);

	event.respondWith(
		caches.match(event.request.url)
		.then((response) => {
			console.log("cached response", response.clone());
			return response;
		})
		.catch(() => {
			return fetch(event.request.clone())
			.then(function (response) {
				console.log("fetched response", response.clone());
				
				/* cache it */
				caches.open(event.request.url)
				.then(function(cache) {
					console.log("caching response...");
					cache.put(event.request.url, response.clone());
				});
				
				return response.clone();
			})
			.catch(function (error) {
				console.error("fetch failed", error);
			});
		})
	);
});