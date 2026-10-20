// Finding the pictures of a product page.   node --experimental-strip-types test/page.test.mjs
import assert from "node:assert/strict";
import { imageDeLaPage, listeShopify, photosDeLaPage, tailleOriginale } from "../src/page.ts";

const base = "https://boutique.example/produits/boite-1234";
const page = `<!doctype html><html><head><title>Boite 1234</title>
<meta property="og:image" content="/photos/a.jpg">
<script type="application/ld+json">{"@type": "Product", "image": ["/photos/a.jpg", {"@type": "ImageObject", "contentUrl": "/photos/b.jpg"}]}</script>
<script type="application/ld+json">pas du json</script>
</head><body><img src="/logo.png"><img data-zoom-image="/photos/c.jpg" src="/photos/c-petite.jpg">
<img srcset="/photos/d-400.jpg 400w, /photos/d-1200.jpg 1200w" src="/photos/d-400.jpg">
<a href="/photos/e.jpg?v=2"><img src="/photos/e-mini.jpg"></a><img src="/dessin.svg"><img src="data:image/gif;base64,R0lGOD">
<picture><source srcset="//cdn.example/f.webp 1x, //cdn.example/f@2x.webp 2x"></picture></body></html>`;

assert.equal(imageDeLaPage(page, base), "https://boutique.example/photos/a.jpg");
assert.deepEqual(photosDeLaPage(page, base), [
	"https://boutique.example/photos/a.jpg", "https://boutique.example/photos/b.jpg", "https://boutique.example/photos/c.jpg",
	"https://boutique.example/photos/d-1200.jpg", "https://boutique.example/photos/e.jpg?v=2", "https://boutique.example/photos/e-mini.jpg",
	"https://cdn.example/f@2x.webp",
]);
assert.equal(tailleOriginale("https://cdn.shopify.com/s/files/1/0/files/boite_400x.jpg?v=12"), "https://cdn.shopify.com/s/files/1/0/files/boite.jpg");
assert.equal(tailleOriginale("https://shop.ch/cdn/shop/files/boite_1200x1200@2x.png?v=1"), "https://shop.ch/cdn/shop/files/boite.png");
assert.equal(tailleOriginale("https://x.ch/wp-content/uploads/2024/01/boite-300x300.jpg"), "https://x.ch/wp-content/uploads/2024/01/boite.jpg");
assert.equal(tailleOriginale("https://x.ch/img/p/12-large_default.jpg"), "https://x.ch/img/p/12-large_default.jpg");
assert.equal(listeShopify('<link href="//cdn.shopify.com/x.css">', "https://shop.ch/products/boite-99?variant=3#top"), "https://shop.ch/products/boite-99.json");
assert.equal(listeShopify('<link href="//cdn.shopify.com/x.css">', "https://shop.ch/collections/tout"), "");
assert.equal(listeShopify("<p>autre boutique</p>", "https://autre.ch/products/x"), "");
console.log("photos des pages : ok");
