const fs = require('fs');

const about = fs.readFileSync('about.html', 'utf-8');
const header = about.split('<main>')[0];
const footer = about.split('</main>')[1];

const main = `<main>
  <div class="container" style="padding:60px 28px 100px;max-width:640px;">
    <div class="text-center" style="margin-bottom:36px;">
      <span class="eyebrow">Get in touch</span>
      <h1>Contact Us</h1>
      <p class="muted">Have a question about an order, sizing, or a custom piece? We're happy to help.</p>
    </div>
    <div class="card">
      <div class="form-msg success hidden" id="contact-success">Thanks — our team will get back to you within 24 hours.</div>
      <div class="form-msg error hidden" id="contact-error">Something went wrong. Please try again.</div>
      <form id="contact-form">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" name="name" id="contact-name" required/></div>
          <div class="form-group"><label>Email</label><input type="email" name="email" id="contact-email" required/></div>
        </div>
        <div class="form-group"><label>Subject</label><input type="text" name="subject" id="contact-subject" required/></div>
        <div class="form-group"><label>Message</label><textarea name="message" id="contact-message" rows="5" required></textarea></div>
        <button class="btn btn-primary btn-block" type="submit" id="contact-submit-btn">Send Message</button>
      </form>
    </div>
    <div class="text-center muted" style="margin-top:24px;font-size:0.9rem;">
      <p>Email: care@ratnajewellery.com &nbsp;|&nbsp; Phone: +91 98765 43210</p>
      <p>Workshop &amp; Studio: Johari Bazaar, Jaipur, Rajasthan, India</p>
    </div>
  </div>
</main>`;

const full = header.replace('<title>Our Story', '<title>Contact Us') + main + footer.replace('<script src="/js/cart.js"></script>', '<script src="/js/cart.js"></script>\n  <script src="/js/contact.js"></script>');

fs.writeFileSync('contact.html', full);
console.log('Fixed contact.html successfully');
