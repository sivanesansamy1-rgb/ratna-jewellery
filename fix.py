import sys
content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Register — RATNA Fine Jewellery</title>
  <meta name="description" content="RATNA Fine Jewellery — certified gold, diamond and gemstone jewellery with lifetime exchange." />
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <div class="top-bar">Complimentary insured shipping on all orders above &#8377;5,000 &nbsp;|&nbsp; Lifetime exchange on gold jewellery</div>
  <header class="site-header">
    <div class="nav-wrap">
      <button class="mobile-toggle" id="mobile-nav-toggle" aria-label="Menu">&#9776;</button>
      <a href="/user/index.html" class="logo">RATNA<span>.</span></a>
      <nav>
        <ul class="main-nav" id="main-nav">
          <li><a href="/user/index.html">Home</a></li>
          <li><a href="/user/shop.html">Shop All</a></li>
          <li><a href="/user/shop/?sort=featured">Bridal</a></li>
          <li><a href="/user/shop/?sort=newest">New Arrivals</a></li>
          <li><a href="/user/shop/?sort=best-selling">Bestsellers</a></li>
          <li><a href="/user/about.html">Our Story</a></li>
          <li><a href="/user/contact.html">Contact</a></li>
        </ul>
      </nav>
      <form class="search-bar" id="nav-search-form">
        <span class="search-icon">&#9906;</span>
        <input type="search" placeholder="Search gold rings, diamond necklaces..." />
      </form>
      <div class="nav-icons">
        <a href="/user/wishlist.html" class="icon-btn" title="Wishlist">&#9825;</a>
        <a href="/user/cart.html" class="icon-btn" title="Cart">&#128092;<span class="badge hidden" id="cart-count-badge">0</span></a>
        <span id="nav-account-slot"></span>
      </div>
    </div>
  </header>

<main>
  <div class="auth-shell">
    <div class="card">
      <div class="text-center" style="margin-bottom:24px;">
        <div class="logo">RATNA<span>.</span></div>
        <p class="muted">Create your account to start shopping.</p>
      </div>
      <form id="register-form">
        <div class="form-msg error hidden form-error-box"></div>
        <div class="form-group"><label>Full Name</label><input type="text" name="name" required/></div>
        <div class="form-group"><label>Email</label><input type="email" name="email" required/></div>
        <div class="form-group"><label>Phone</label><input type="tel" name="phone" required/></div>
        <div class="form-group">
          <label>Password</label>
          <div style="position: relative;">
            <input type="password" name="password" minlength="8" required style="padding-right: 40px;"/>
            <button type="button" onclick="const input = this.previousElementSibling; input.type = input.type === 'password' ? 'text' : 'password'; this.innerHTML = input.type === 'password' ? '👁️' : '🙈';" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; opacity: 0.6; padding: 0;" title="Toggle password visibility">👁️</button>
          </div>
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <div style="position: relative;">
            <input type="password" name="confirmPassword" minlength="8" required style="padding-right: 40px;"/>
            <button type="button" onclick="const input = this.previousElementSibling; input.type = input.type === 'password' ? 'text' : 'password'; this.innerHTML = input.type === 'password' ? '👁️' : '🙈';" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.1rem; opacity: 0.6; padding: 0;" title="Toggle password visibility">👁️</button>
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit">Create Account</button>
      </form>
      <p class="helper-link muted">Already have an account? <a href="/user/login.html">Log in</a></p>
    </div>
  </div>
</main>
"""
with open('c:/Users/Sivanesan S/Downloads/jewellery-store/jewellery-store/frontend/user/register.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

idx = -1
for i, line in enumerate(lines):
    if '<div class="newsletter">' in line:
        idx = i
        break

if idx != -1:
    with open('c:/Users/Sivanesan S/Downloads/jewellery-store/jewellery-store/frontend/user/register.html', 'w', encoding='utf-8') as f:
        f.write(content + ''.join(lines[idx:]))
    print('Fixed successfully')
else:
    print('Newsletter div not found')
