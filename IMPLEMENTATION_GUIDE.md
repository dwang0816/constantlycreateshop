# Gang Sheet / DTF Print Store — Implementation Guide

> **Scope:** Image upload → DPI extraction → background removal → image resize → cart pricing → Stripe Checkout  
> **Stack:** React (frontend) · Node.js/Express (backend) · Sharp (image processing) · Stripe (payments)

---

## Dependencies

### Backend
```bash
npm install express multer sharp stripe @sendgrid/mail dropbox exif-js pg axios cors dotenv
```

### Frontend
```bash
npm install exif-js
```

### Key versions (from working repo)
| Package | Version |
|---|---|
| `sharp` | `^0.34.2` |
| `multer` | `^1.4.5-lts.1` |
| `stripe` | `^14.0.0` |
| `exif-js` | `^2.3.0` |
| `pg` | `^8.11.0` |

---

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_URL=https://your-backend.railway.app/api
VITE_STRIPE_API_URL=https://your-backend.railway.app/api
SUCCESS_URL=https://yourdomain.com/success
CANCEL_URL=https://yourdomain.com
```

---

## Part 1 — Product Variants (Sizes)

The store sells gang sheets in fixed sizes (22" wide roll, variable height). These are hardcoded — no Shopify/CMS needed.

### Step 1.1 — Define variants on the backend

```js
// production-server.js
const GANG_SHEET_VARIANTS = [
  { id: 'dtf_22x5',   title: '22"×5"',   price: 3.50,  width: 22, height: 5   },
  { id: 'dtf_22x10',  title: '22"×10"',  price: 5.00,  width: 22, height: 10  },
  { id: 'dtf_22x20',  title: '22"×20"',  price: 8.00,  width: 22, height: 20  },
  { id: 'dtf_22x36',  title: '22"×36"',  price: 12.00, width: 22, height: 36  },
  { id: 'dtf_22x60',  title: '22"×60"',  price: 18.00, width: 22, height: 60  },
  { id: 'dtf_22x100', title: '22"×100"', price: 28.00, width: 22, height: 100 },
  { id: 'dtf_22x200', title: '22"×200"', price: 48.00, width: 22, height: 200 },
  { id: 'dtf_22x300', title: '22"×300"', price: 68.00, width: 22, height: 300 },
];

app.get('/api/products', (req, res) => {
  res.json({ products: GANG_SHEET_VARIANTS });
});
```

### Step 1.2 — Fetch variants on the frontend

```js
// ProductPage.js
const [variants, setVariants] = useState([]);

useEffect(() => {
  fetch(`${API_BASE_URL}/api/products`)
    .then(r => r.json())
    .then(data => setVariants(data.products));
}, []);
```

### Step 1.3 — Variant matching logic

When an image is uploaded, find the smallest variant that fits it.

```js
// ProductPage.js — findClosestVariant()
function findClosestVariant(widthIn, heightIn, variants) {
  // Try normal orientation first, then rotated
  const fits = (v, w, h) => v.width >= w && v.height >= h;

  // Sort variants by area (smallest first)
  const sorted = [...variants].sort((a, b) => (a.width * a.height) - (b.width * b.height));

  // Normal orientation
  let match = sorted.find(v => fits(v, widthIn, heightIn));

  // Rotated orientation
  if (!match) match = sorted.find(v => fits(v, heightIn, widthIn));

  // Fallback: largest available
  if (!match) match = sorted[sorted.length - 1];

  return match;
}
```

---

## Part 2 — Image Upload & DPI Extraction

### Step 2.1 — File input (frontend)

```jsx
// ProductPage.js
<input
  type="file"
  accept="image/png,image/jpeg,image/jpg"
  style={{ display: 'none' }}
  ref={fileInputRef}
  onChange={handleFileChange}
/>
```

Drag-and-drop: attach `onDrop`, `onDragOver`, `onDragLeave` to the drop zone div. On drop, construct a synthetic event: `handleFileChange({ target: { files: e.dataTransfer.files } })`.

### Step 2.2 — Extract DPI from the file header (client-side, before upload)

DPI must be read before anything else — it determines print dimensions.

```js
// ProductPage.js — extractDPI()
function extractDPI(file) {
  return new Promise((resolve) => {
    // Method 1: EXIF tags (works for JPEG)
    EXIF.getData(file, function () {
      const xRes = EXIF.getTag(this, 'XResolution');
      const unit = EXIF.getTag(this, 'ResolutionUnit');
      if (xRes) {
        const dpi = unit === 3 ? Math.round(xRes * 2.54) : xRes; // cm → in
        return resolve(dpi);
      }

      // Method 2: Raw binary header (works for PNG + JPEG)
      const reader = new FileReader();
      reader.onload = (e) => {
        const buf = e.target.result;
        const view = new DataView(buf);

        // PNG: look for pHYs chunk
        if (file.type === 'image/png') {
          let offset = 8;
          while (offset < buf.byteLength - 12) {
            const len = view.getUint32(offset);
            const type = String.fromCharCode(
              view.getUint8(offset + 4), view.getUint8(offset + 5),
              view.getUint8(offset + 6), view.getUint8(offset + 7)
            );
            if (type === 'pHYs') {
              const ppmX = view.getUint32(offset + 8);
              const unit = view.getUint8(offset + 16);
              if (unit === 1) return resolve(Math.round(ppmX / 39.3701)); // px/m → dpi
            }
            offset += 12 + len;
          }
        }

        // JPEG: look for JFIF APP0
        if (file.type !== 'image/png') {
          for (let i = 0; i < Math.min(buf.byteLength - 10, 200); i++) {
            if (view.getUint8(i) === 0x4A && // 'J'
                view.getUint8(i + 1) === 0x46 && // 'F'
                view.getUint8(i + 2) === 0x49 && // 'I'
                view.getUint8(i + 3) === 0x46) { // 'F'
              const unit = view.getUint8(i + 7);
              const xDens = view.getUint16(i + 8);
              if (unit === 1 && xDens > 0) return resolve(xDens);
              if (unit === 2 && xDens > 0) return resolve(Math.round(xDens * 2.54));
            }
          }
        }

        resolve(null); // No DPI found
      };
      reader.readAsArrayBuffer(file.slice(0, 60000));
    });
  });
}
```

### Step 2.3 — handleFileChange (main upload handler)

```js
// ProductPage.js
const handleFileChange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // 1. Type check
  const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
  if (!allowed.includes(file.type)) {
    setError('Only PNG and JPEG files are accepted.');
    return;
  }

  // 2. Size check (100MB max)
  if (file.size > 100 * 1024 * 1024) {
    setError('File must be under 100MB.');
    return;
  }

  // 3. Extract DPI — REQUIRED before any processing
  const dpi = await extractDPI(file);
  if (!dpi) {
    setError('Could not read DPI from this file. Re-export at 300 DPI from your design app.');
    return;
  }

  // 4. Send to backend for transparent-edge trim only (no BG removal yet)
  const formData = new FormData();
  formData.append('image', file);
  formData.append('removeWhite', 'false');
  formData.append('removeBlack', 'false');

  const res = await fetch(`${API_BASE_URL}/api/process-image`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();

  if (!data.success) {
    setError(data.error || 'Image processing failed.');
    return;
  }

  // 5. Convert returned base64 back to a File object
  const base64 = data.imageDataUrl.split(',')[1];
  const bytes = atob(base64);
  const byteArray = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) byteArray[i] = bytes.charCodeAt(i);
  const blob = new Blob([byteArray], { type: 'image/png' });
  const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' });

  // 6. Calculate print dimensions in inches
  const img = new Image();
  img.onload = () => {
    const widthIn  = img.naturalWidth  / dpi;
    const heightIn = img.naturalHeight / dpi;

    // 7. Find matching variant
    const variant = findClosestVariant(widthIn, heightIn, variants);

    // 8. Add to cart
    addToCartFromUpload(processedFile, variant, img.naturalWidth, img.naturalHeight, dpi, widthIn, heightIn, data.spotTifTempPath);
  };
  img.src = URL.createObjectURL(processedFile);
};
```

### Step 2.4 — Backend: `/api/process-image` endpoint

```js
// production-server.js
const multer = require('multer');
const sharp = require('sharp');

const uploadSingle = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

app.post('/api/process-image', uploadSingle.single('image'), async (req, res) => {
  try {
    let buffer = req.file.buffer;
    const removeWhite = req.body.removeWhite === 'true';
    const removeBlack = req.body.removeBlack === 'true';

    // --- White background removal ---
    if (removeWhite) {
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        // Chebyshev distance from white (255,255,255)
        const dist = Math.max(Math.abs(255 - r), Math.abs(255 - g), Math.abs(255 - b));
        if (dist <= 50) {
          pixels[i + 3] = 0; // fully transparent
        } else if (dist <= 199) {
          // smooth transition zone
          const t = (dist - 50) / 149;
          pixels[i + 3] = Math.round(t * 255 * 0.95);
        }
        // dist >= 200 → leave alpha unchanged (content pixel)
      }

      buffer = await sharp(Buffer.from(pixels), {
        raw: { width: info.width, height: info.height, channels: 4 }
      }).png().toBuffer();
    }

    // --- Black background removal ---
    if (removeBlack) {
      const { data, info } = await sharp(buffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8Array(data);
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        // Chebyshev distance from black (0,0,0)
        const dist = Math.max(r, g, b);
        if (dist <= 50) {
          pixels[i + 3] = 0;
        } else if (dist <= 119) {
          const t = (dist - 50) / 69;
          pixels[i + 3] = Math.round(t * 255);
        }
      }

      buffer = await sharp(Buffer.from(pixels), {
        raw: { width: info.width, height: info.height, channels: 4 }
      }).png().toBuffer();
    }

    // --- Transparent-edge trim (always runs) ---
    const { data: trimData, info: trimInfo } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const px = new Uint8Array(trimData);
    const { width: w, height: h } = trimInfo;
    let top = h, bottom = 0, left = w, right = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = px[(y * w + x) * 4 + 3];
        if (alpha > 10) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }

    if (top <= bottom && left <= right) {
      buffer = await sharp(buffer).extract({
        left, top,
        width: right - left + 1,
        height: bottom - top + 1,
      }).png().toBuffer();
    }

    // Return as base64 data URL
    const base64 = buffer.toString('base64');
    const meta = await sharp(buffer).metadata();

    res.json({
      success: true,
      imageDataUrl: `data:image/png;base64,${base64}`,
      finalDimensions: { width: meta.width, height: meta.height },
    });

  } catch (err) {
    console.error('/api/process-image error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
```

---

## Part 3 — Remove White Background (from cart)

After an image is in the cart, the user can click "Remove White BG". This re-sends the image to `/api/process-image` with `removeWhite: 'true'`.

### Step 3.1 — Frontend (ShoppingCartPreview component)

```js
// ShoppingCartPreview.js
const handleRemoveWhite = async (item, index) => {
  setProcessingIndex(index);
  try {
    // Use the resized full-res file path if the item was resized, otherwise use the cart file
    const formData = new FormData();
    const file = await getFileFromIndexedDB(item.id); // read from IndexedDB
    formData.append('image', file);
    formData.append('removeWhite', 'true');
    if (item.customData?.resizedImageTempPath) {
      formData.append('resizedImageTempPath', item.customData.resizedImageTempPath);
    }

    const res = await fetch(`${API_BASE_URL}/api/process-image`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      // Callback to parent to update the cart item
      onRemoveWhiteBackground(item.id, data);
    }
  } finally {
    setProcessingIndex(null);
  }
};
```

### Step 3.2 — Parent callback updates cart state

```js
// ProductPage.js
const handleRemoveWhiteBackground = async (cartItemId, result) => {
  // Convert the returned base64 to a new File
  const base64 = result.imageDataUrl.split(',')[1];
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'image/png' });
  const newFile = new File([blob], `nobg_${cartItemId}.png`, { type: 'image/png' });

  // Overwrite the stored file in IndexedDB
  await saveFileToIndexedDB(newFile, cartItemId);

  // Update the cart item dimensions and thumbnail
  setCartItems(prev => {
    const updated = prev.map(item => {
      if (item.id !== cartItemId) return item;
      const newW = result.finalDimensions.width;
      const newH = result.finalDimensions.height;
      const dpi = item.customData.dpi;
      const widthIn = newW / dpi;
      const heightIn = newH / dpi;
      const variant = findClosestVariant(widthIn, heightIn, variants);
      return {
        ...item,
        variant,
        customData: {
          ...item.customData,
          imgWidth: newW,
          imgHeight: newH,
          printWidth: widthIn,
          printHeight: heightIn,
        },
        thumbnailUrl: result.imageDataUrl,
      };
    });
    return repriceCartItems(updated);
  });
};
```

> **Remove Black Background** works identically — send `removeBlack: 'true'` instead. The backend uses the same pixel-loop with target `(0,0,0)` and a tighter threshold range (`dist <= 119`).

---

## Part 4 — Image Resize

### Step 4.1 — Resize UI state

In the cart, each item gets an expand panel with width/height inputs (in inches) and a DPI selector.

```js
// In CartItem component
const [targetWidth, setTargetWidth] = useState(item.customData.printWidth);
const [targetHeight, setTargetHeight] = useState(item.customData.printHeight);
const [targetDpi, setTargetDpi] = useState(300);
const aspectRatio = item.customData.printWidth / item.customData.printHeight;

const onWidthChange = (val) => {
  setTargetWidth(val);
  setTargetHeight(+(val / aspectRatio).toFixed(3)); // lock aspect ratio
};
const onHeightChange = (val) => {
  setTargetHeight(val);
  setTargetWidth(+(val * aspectRatio).toFixed(3));
};
```

### Step 4.2 — Frontend: send resize request

```js
// CartItemResizer / handleResize
const handleResize = async () => {
  setIsResizing(true);
  const file = await getFileFromIndexedDB(cartItemId);

  const formData = new FormData();
  formData.append('image', file);
  formData.append('targetWidthInches', String(targetWidth));
  formData.append('targetHeightInches', String(targetHeight));
  formData.append('dpi', String(targetDpi));
  formData.append('format', 'png');

  const res = await fetch(`${API_BASE_URL}/api/resize-image`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();

  if (data.success) {
    onCartItemResize(cartItemId, data); // callback to parent
  }
  setIsResizing(false);
};
```

### Step 4.3 — Backend: `/api/resize-image`

```js
// production-server.js
app.post('/api/resize-image', uploadSingle.single('image'), async (req, res) => {
  try {
    const targetWidthIn  = parseFloat(req.body.targetWidthInches);
    const targetHeightIn = parseFloat(req.body.targetHeightInches);
    const dpi = parseInt(req.body.dpi) || 300;
    const format = req.body.format || 'png';

    // Validation
    if (isNaN(targetWidthIn) || isNaN(targetHeightIn)) {
      return res.status(400).json({ success: false, error: 'Invalid dimensions.' });
    }
    if (targetWidthIn > 16 || targetHeightIn > 300) {
      return res.status(400).json({ success: false, error: 'Dimensions exceed max allowed.' });
    }

    const targetWidthPx  = Math.round(targetWidthIn  * dpi);
    const targetHeightPx = Math.round(targetHeightIn * dpi);

    // Resize with Sharp (Lanczos3 = highest quality)
    const resizedBuffer = await sharp(req.file.buffer, {
      unlimited: true,
      limitInputPixels: false,
    })
      .resize({
        width:  targetWidthPx,
        height: targetHeightPx,
        fit:    'inside',
        withoutEnlargement: false,
        kernel: 'lanczos3',
      })
      .withMetadata({ density: dpi })
      .png({ compressionLevel: 9, quality: 85 })
      .toBuffer();

    // Save full-res to disk (needed at checkout)
    const filename = `resized_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}.png`;
    const diskPath = path.join('./uploads', filename);
    fs.writeFileSync(diskPath, resizedBuffer);

    // Return a 600px thumbnail as base64 (keep response small)
    const thumbBuffer = await sharp(resizedBuffer)
      .resize({ width: 600, fit: 'inside' })
      .png()
      .toBuffer();

    res.json({
      success: true,
      imageDataUrl: `data:image/png;base64,${thumbBuffer.toString('base64')}`,
      finalDimensions: { width: targetWidthPx, height: targetHeightPx },
      resizedImageTempPath: diskPath, // sent back to identify full-res file at checkout
      dpi,
    });

  } catch (err) {
    console.error('/api/resize-image error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
```

### Step 4.4 — Parent updates cart item after resize

```js
// ProductPage.js — handleCartItemResize
const handleCartItemResize = async (cartItemId, data) => {
  // Update the thumbnail stored in IndexedDB with the 600px preview
  const base64 = data.imageDataUrl.split(',')[1];
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'image/png' });
  const thumbFile = new File([blob], `resized_${cartItemId}.png`, { type: 'image/png' });
  await saveFileToIndexedDB(thumbFile, cartItemId);

  setCartItems(prev => {
    const updated = prev.map(item => {
      if (item.id !== cartItemId) return item;
      const dpi = data.dpi || item.customData.dpi;
      const newW = data.finalDimensions.width;
      const newH = data.finalDimensions.height;
      const widthIn  = newW / dpi;
      const heightIn = newH / dpi;
      const variant = findClosestVariant(widthIn, heightIn, variants);
      return {
        ...item,
        variant,
        thumbnailUrl: data.imageDataUrl,
        customData: {
          ...item.customData,
          dpi,
          imgWidth: newW,
          imgHeight: newH,
          printWidth: widthIn,
          printHeight: heightIn,
          resizedImageTempPath: data.resizedImageTempPath, // ← crucial for checkout
        },
      };
    });
    return repriceCartItems(updated);
  });
};
```

---

## Part 5 — Cart & Volume Pricing

### Step 5.1 — Volume pricing tiers

All items are priced together based on **combined** total square inches — more items = lower rate for everyone.

```js
// ProductPage.js — calculateVolumePricing()
const PRICING_TIERS = [
  { min: 0,    max: 10,   rate: 0.35 },
  { min: 10,   max: 20,   rate: 0.25 },
  { min: 20,   max: 50,   rate: 0.15 },
  { min: 50,   max: 100,  rate: 0.10 },
  { min: 100,  max: 200,  rate: 0.08 },
  { min: 200,  max: 400,  rate: 0.06 },
  { min: 400,  max: 700,  rate: 0.05 },
  { min: 700,  max: 1000, rate: 0.04 },
  { min: 1000, max: 2500, rate: 0.03 },
  { min: 2500, max: Infinity, rate: 0.02 },
];

function getRate(totalSqIn) {
  return PRICING_TIERS.find(t => totalSqIn >= t.min && totalSqIn < t.max)?.rate ?? 0.02;
}

// Recalculates prices for every cart item based on aggregate total
function repriceCartItems(items) {
  const totalSqIn = items.reduce((sum, item) => {
    const sqIn = item.customData.printWidth * item.customData.printHeight;
    return sum + sqIn * item.quantity;
  }, 0);

  const rate = getRate(totalSqIn);

  return items.map(item => {
    const sqIn = item.customData.printWidth * item.customData.printHeight;
    const price = +(sqIn * item.quantity * rate).toFixed(2);
    return { ...item, price, customData: { ...item.customData, rate } };
  });
}
```

> Call `repriceCartItems()` on every cart mutation: add, remove, quantity change, resize.

### Step 5.2 — Cart persistence

```js
// On every cartItems change — save metadata to localStorage
useEffect(() => {
  if (!cartRestored) return;
  const metadata = cartItems.map(({ id, variant, price, quantity, customData, thumbnailUrl }) => ({
    id, variant, price, quantity, customData, thumbnailUrl,
  }));
  localStorage.setItem('cart_metadata', JSON.stringify(metadata));
}, [cartItems]);

// On mount — restore cart from localStorage + IndexedDB
useEffect(() => {
  const raw = localStorage.getItem('cart_metadata');
  if (raw) {
    const metadata = JSON.parse(raw);
    setCartItems(metadata); // thumbnails show immediately from stored URLs
    // Separately rehydrate File objects from IndexedDB (async)
    metadata.forEach(async (item) => {
      const file = await getFileFromIndexedDB(item.id);
      // file is available for checkout even if not shown in UI
    });
  }
  setCartRestored(true);
}, []);
```

**IndexedDB helpers** (store `File` objects — not JSON-serializable):

```js
// ProductPage.js
const DB_NAME = 'CartFilesDB';
const STORE_NAME = 'cartFiles';

function openCartDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'cartItemId' });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}

async function saveFileToIndexedDB(file, cartItemId) {
  const db = await openCartDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      cartItemId,
      file,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function getFileFromIndexedDB(cartItemId) {
  const db = await openCartDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(cartItemId);
    req.onsuccess = (e) => {
      const record = e.target.result;
      if (!record || record.expiresAt < Date.now()) return resolve(null);
      resolve(record.file);
    };
    req.onerror = () => resolve(null);
  });
}
```

---

## Part 6 — Stripe Checkout

### Step 6.1 — Frontend: trigger checkout

```js
// ProductPage.js — handleMultiItemCheckout
const handleMultiItemCheckout = async (items) => {
  if (checkoutInProgress.current) return;
  checkoutInProgress.current = true;

  const formData = new FormData();

  // Attach files — first item is 'image', rest are 'additionalFile_N'
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let file = await getFileFromIndexedDB(item.id);
    if (!file) { alert('A file is missing. Please re-upload.'); return; }

    if (i === 0) {
      formData.append('image', file);
    } else {
      formData.append(`additionalFile_${i}`, file);
    }
  }

  // Attach metadata for each item
  const itemsMetadata = items.map((item, i) => ({
    index: i,
    variantId: item.variant.id,
    variantTitle: item.variant.title,
    quantity: item.quantity,
    price: item.price,
    printWidth: item.customData.printWidth,
    printHeight: item.customData.printHeight,
    dpi: item.customData.dpi,
    resizedImageTempPath: item.customData.resizedImageTempPath || null,
  }));

  formData.append('additionalItems', JSON.stringify(itemsMetadata.slice(1)));
  formData.append('variantId',    items[0].variant.id);
  formData.append('variantTitle', items[0].variant.title);
  formData.append('quantity',     String(items[0].quantity));
  formData.append('price',        String(items[0].price));
  formData.append('printWidth',   String(items[0].customData.printWidth));
  formData.append('printHeight',  String(items[0].customData.printHeight));
  formData.append('dpi',          String(items[0].customData.dpi));
  if (items[0].customData.resizedImageTempPath) {
    formData.append('resizedImageTempPath', items[0].customData.resizedImageTempPath);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/stripe-checkout`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (data.url) {
      localStorage.setItem('checkout_initiated', 'true');
      window.location.href = data.url; // redirect to Stripe Hosted Checkout
    } else {
      alert(data.error || 'Checkout failed.');
    }
  } finally {
    checkoutInProgress.current = false;
  }
};
```

### Step 6.2 — Backend: `/api/stripe-checkout`

```js
// production-server.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// multer for multi-file disk upload
const checkoutUpload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
  }),
}).any();

app.post('/api/stripe-checkout', checkoutUpload, async (req, res) => {
  try {
    const {
      variantTitle, price, quantity,
      printWidth, printHeight, dpi,
      resizedImageTempPath, additionalItems,
    } = req.body;

    const primaryFile = req.files.find(f => f.fieldname === 'image');
    const primaryDiskPath = resizedImageTempPath || primaryFile.path;

    // Parse additional items
    let parsedAdditional = [];
    try { parsedAdditional = JSON.parse(additionalItems || '[]'); } catch {}

    // Build Stripe line items
    const lineItems = [];

    // Primary item
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `DTF Gang Sheet — ${variantTitle}`,
          description: `${parseFloat(printWidth).toFixed(2)}" × ${parseFloat(printHeight).toFixed(2)}" @ ${dpi} DPI`,
        },
        unit_amount: Math.round(parseFloat(price) * 100), // cents
      },
      quantity: 1, // always 1; price already includes quantity multiplier
    });

    // Additional items
    for (const addItem of parsedAdditional) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `DTF Gang Sheet — ${addItem.variantTitle}`,
            description: `${parseFloat(addItem.printWidth).toFixed(2)}" × ${parseFloat(addItem.printHeight).toFixed(2)}"`,
          },
          unit_amount: Math.round(parseFloat(addItem.price) * 100),
        },
        quantity: 1,
      });
    }

    // Flat shipping
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping & Handling' },
        unit_amount: 1000, // $10.00
      },
      quantity: 1,
    });

    // Pre-generate order number from DB
    const orderNumber = await generateOrderNumber(); // e.g. "Order#000045"

    // Build metadata for webhook
    const additionalDiskPaths = parsedAdditional.map((item, i) => {
      const addFile = req.files.find(f => f.fieldname === `additionalFile_${i + 1}`);
      return item.resizedImageTempPath || addFile?.path || '';
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'link'],
      mode: 'payment',
      line_items: lineItems,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      phone_number_collection: { enabled: true },
      customer_creation: 'always',
      invoice_creation: { enabled: true },
      success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.CANCEL_URL,
      metadata: {
        orderNumber,
        primaryDiskFilename: path.basename(primaryDiskPath),
        additionalDiskFilenames: JSON.stringify(additionalDiskPaths.map(p => path.basename(p))),
      },
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error('/api/stripe-checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});
```

### Step 6.3 — Webhook (post-payment fulfillment)

```js
// production-server.js
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }), // MUST use raw body
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook signature error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Idempotency guard
      if (processedSessions.has(session.id)) return res.json({ received: true });
      processedSessions.add(session.id);

      const { orderNumber, primaryDiskFilename, additionalDiskFilenames } = session.metadata;
      const primaryPath = path.join('./uploads', primaryDiskFilename);
      const additionalPaths = JSON.parse(additionalDiskFilenames || '[]')
        .map(f => path.join('./uploads', f));

      // 1. Upload files to Dropbox
      await uploadFilesToDropbox(orderNumber, primaryPath, additionalPaths);

      // 2. Send emails (SendGrid)
      await sendVendorEmail(session, orderNumber);
      await sendCustomerConfirmationEmail(session, orderNumber);
    }

    res.json({ received: true });
  }
);
```

> **Important:** The webhook route must be declared **before** `express.json()` middleware so it receives the raw body.

---

## Part 7 — Success Page

On the success URL, read the session from Stripe and clear the cart:

```js
// SuccessPage.js
useEffect(() => {
  const sessionId = new URLSearchParams(window.location.search).get('session_id');
  if (!sessionId) return;

  fetch(`${API_BASE_URL}/api/session/${sessionId}`)
    .then(r => r.json())
    .then(data => {
      setOrderDetails(data); // display order confirmation
      // Clear cart
      localStorage.removeItem('cart_metadata');
      clearCartFilesFromIndexedDB();
    });
}, []);
```

Backend session endpoint:
```js
app.get('/api/session/:sessionId', async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId, {
    expand: ['line_items', 'customer'],
  });
  res.json({
    customerEmail: session.customer_details?.email,
    orderNumber: session.metadata?.orderNumber,
    amountTotal: session.amount_total,
    lineItems: session.line_items?.data,
  });
});
```

---

## Data Flow Summary

```
File picked
  → extractDPI()                     [client, exif-js + ArrayBuffer]
  → POST /api/process-image          [server, sharp: trim transparent edges]
  → base64 → File conversion         [client]
  → measure pixel dimensions         [client, Image onload]
  → findClosestVariant()             [client, pure JS]
  → addToCartFromUpload()            [client]
  → saveFileToIndexedDB()            [client, IndexedDB]
  → repriceCartItems()               [client, pure JS, volume tiers]

[Optional] Remove White/Black BG
  → POST /api/process-image (removeWhite/removeBlack: true)  [server, sharp pixel loop]
  → update cart item + IndexedDB    [client]
  → repriceCartItems()              [client]

[Optional] Resize
  → POST /api/resize-image          [server, sharp Lanczos3]
  → save full-res to ./uploads/     [server]
  → return 600px thumbnail + disk path  [server → client]
  → update cart item + IndexedDB   [client]
  → repriceCartItems()             [client]

Checkout
  → read files from IndexedDB      [client]
  → POST /api/stripe-checkout      [server, multer disk storage]
  → stripe.checkout.sessions.create()  [server → Stripe]
  → redirect to session.url        [client]

[Stripe Hosted Checkout page]

POST /api/webhooks/stripe (checkout.session.completed)
  → read files from ./uploads/     [server]
  → upload to Dropbox              [server → Dropbox API]
  → send emails                    [server → SendGrid]
  → mark session processed         [server, idempotency]
```

---

## Common Gotchas

| Gotcha | Fix |
|---|---|
| Webhook gets JSON body | Register `/api/webhooks/stripe` **before** `express.json()` and use `express.raw()` |
| `quantity: 1` always | Put full price in `unit_amount` to avoid rounding on Stripe's side |
| Resized file path lost | Store `resizedImageTempPath` in `cartItem.customData` and pass it through every operation |
| DPI null on re-export | Many design apps strip DPI — instruct users to export at 300 DPI with "embed color profile" |
| IndexedDB `File` expires | Set `expiresAt: now + 24h` and run cleanup on mount |
| Sharp `limitInputPixels` | Set `{ unlimited: true, limitInputPixels: false }` on large files or Sharp will throw |
| Uploads pile up on disk | Run `cleanupOldFiles()` on a timer to delete files older than 24 hours |
