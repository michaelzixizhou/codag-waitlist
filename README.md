# Codag - Waitlist

Simple waitlist landing page with Google Forms integration.

## Quick Start

1. Open `index.html` in your browser to preview
2. Set up Google Forms (see below)
3. Deploy to any static host

## Google Forms Setup

### Step 1: Create the Form
1. Go to [forms.google.com](https://forms.google.com)
2. Click **Blank** to create a new form
3. Add one question: type "Email" and select **Short answer**
4. Make it **Required**

### Step 2: Link to Google Sheets
1. Click the **Responses** tab
2. Click the green Sheets icon
3. Select **Create a new spreadsheet**
4. Now all submissions auto-populate in Sheets

### Step 3: Get the Form Action URL
1. Click **Send** button (top right)
2. Click the link icon
3. Copy the URL - it looks like:
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSe.../viewform
   ```
4. Change `viewform` to `formResponse`:
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSe.../formResponse
   ```

### Step 4: Get the Email Field ID
1. Click the 3-dot menu (top right) → **Get pre-filled link**
2. Enter any email in the field, click **Get Link**
3. Look at the URL for `entry.XXXXXXXXX=`
4. Copy the `entry.XXXXXXXXX` part (including "entry.")

### Step 5: Update script.js
Open `script.js` and replace the placeholders:

```javascript
const GOOGLE_FORM_ACTION = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';
const GOOGLE_FORM_EMAIL_FIELD = 'entry.123456789';
```

## Customization

### Add Demo Images
Replace the placeholder in `index.html`:
```html
<!-- Find this section and replace with your image -->
<div class="demo-placeholder ...">
    <img src="your-demo.gif" alt="Demo" class="rounded-xl">
</div>
```

### Change Colors
Edit the Tailwind classes or the CSS variables in `<style>`:
- Purple: `#8b5cf6`
- Blue: `#3b82f6`
- Background: `#0a0a0a`

### Add Logo
Add before the `<h1>` in the hero section:
```html
<img src="logo.svg" alt="Logo" class="h-12 mx-auto mb-8">
```

## Deployment

### Vercel
```bash
npm i -g vercel
vercel
```

### Netlify
Drag and drop the folder to [netlify.com/drop](https://netlify.com/drop)

### GitHub Pages
1. Push to GitHub
2. Settings → Pages → Source: main branch

## Files

```
├── index.html    # Main page
├── script.js     # Form handling + animations
└── README.md     # This file
```
