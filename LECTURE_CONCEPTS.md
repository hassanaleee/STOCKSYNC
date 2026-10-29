# Lecture concepts used in StockSync (Lectures 1 - 7)

Use this list for the viva: it tells you where to point in the code.

## Lecture 1 - Web basics
| Concept | Where |
|---|---|
| Client-server request/response | Browser (React) sends `fetch('/api/...')` in `client/src/utils/api.js`; Express answers in `server/src/routes/*.js` |
| HTTP methods (GET, POST, PUT, PATCH, DELETE) | Every route file in `server/src/routes` |
| Absolute vs relative URL | Footer link to `https://lahore.comsats.edu.pk` (absolute) in `Layout.jsx`; `/api/products` (relative) in `api.js` |
| SPA (single-page application) | The whole client is an SPA built with React Router (`App.jsx`) |
| Dynamic website | Pages are filled with data from the database |

## Lecture 2 - Tiered architecture
| Concept | Where |
|---|---|
| Three-tier architecture | Presentation = `client/`, Application/logic = `server/src/routes`, Data = `server/src/db.js` (database) |
| Separation of concerns | Pages, components, context, utils are separate folders; each route file handles one feature |

## Lecture 3 - HTML / HTML5
| Concept | Where |
|---|---|
| Document structure (`DOCTYPE`, `head`, `body`, `title`, `meta`) | `client/index.html` |
| Semantic elements `header`, `nav`, `main`, `section`, `article`, `aside`, `footer` | `Layout.jsx` (aside + nav + header + main + footer), `Dashboard.jsx` (section + article), `AuthLayout.jsx` |
| Headings `h1`-`h6`, paragraphs, links | All pages |
| Images with `alt` | `logo.svg` and `welcome.svg` (Layout, Dashboard, AuthLayout) |
| Tables (`table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`) | Products, Orders, Reports pages |
| Ordered list `ol`, unordered list `ul`, description list `dl` | `AuthLayout.jsx` (ol + dl), `Layout.jsx` (ul menu), Dashboard lists |
| Not used: `audio` / `video` (no media in an inventory system) | - |

## Lecture 4 - Semantic HTML and forms
| Concept | Where |
|---|---|
| `div` (block) and `span` (inline) | Used throughout, e.g. `.stat-card`, `.badge` |
| Form `action` and `method` | Header search form: `<form action="/products" method="get">` in `Layout.jsx`; login/register forms use `method="post"` |
| GET vs POST | Header search uses GET (value goes in the URL: `/products?q=cable`); login uses POST |
| Controls: `input`, `select`, `textarea`, `button`, `label`, `fieldset`, `datalist` | `Products.jsx` (ProductForm), `Suppliers.jsx` (textarea), `Orders.jsx` (fieldset) |
| Input types: `text`, `email`, `password`, `number`, `date`, `tel`, `search` | Login, Register, Products, Orders, Reports pages |
| HTML5 validation: `required`, `pattern`, `min`, `max`, `minLength` | SKU `pattern` (Products.jsx), name `pattern` (Register.jsx), `min`/`max` on numbers and dates |
| Server-side validation (client-side is not enough) | `checkProduct()` in `server/src/routes/products.js`, and every other route |

## Lecture 5 - CSS fundamentals
| Concept | Where |
|---|---|
| CSS syntax (selector, property, value) | All `.css` files in `client/src/styles` |
| External CSS | `main.jsx` imports the 4 CSS files |
| Inline CSS | Small `style={{...}}` on the chart legend dots in `Dashboard.jsx` |
| Selectors: element, class, id, attribute, grouping, descendant | `h1, h2, h3` (grouping), `input[type='number']` (attribute), `.nav-list .nav-link` (descendant), `#main-content` (id, used by the skip link), `.card` (class) - see `base.css`, `layout.css` |
| Pseudo-classes `:hover`, `:focus`, `:first-child`, `:last-child` | `a:hover`, `input:focus`, `.auth-steps li:first-child`, `tbody tr:last-child td` |
| Pseudo-elements `::before`, `::after`, `::first-letter` | Blue bar on the active menu link (`layout.css`), red `*` on required labels (`base.css`), drop-letter in the welcome card (`components.css`) |
| Cascade, specificity, source order | `.btn-primary` overrides `.btn`; `.nav-link.active` is more specific than `.nav-link` |
| Inheritance | Font and colour are set once on `body` in `base.css` |
| Colour, font, text, background properties | `base.css` (CSS variables for the whole colour palette) |

## Lecture 6 - Box model and display
| Concept | Where |
|---|---|
| Box model (content, padding, border, margin) | `.card` in `components.css` |
| `box-sizing: border-box` | First rule after the variables in `base.css` |
| `width`, `height`, `min`/`max` | `.modal { max-width: 520px }`, `main { max-width: 1400px }` |
| `overflow` (`hidden`, `auto`) | `.table-wrap { overflow: auto }`, `.sr-only { overflow: hidden }` |
| `display`: `block`, `inline-block`, `none` | `.block`, `.badge` and `.legend-dot` (inline-block), `.menu-btn { display: none }` |
| Borders, shadows, consistent spacing | Spacing variables `--space-1 ... --space-8`; `--shadow-float` on modal, dropdown, toast |

## Lecture 7 - Positioning
| Concept | Where |
|---|---|
| `position: relative` + `absolute` | Eye button inside the password input (`auth.css`), search icon inside the search box (`layout.css`), blue bar on the active link |
| `position: fixed` | Sidebar, modal overlay, toast messages |
| `position: sticky` | Top bar (`.topbar`) and table header (`thead th`) |
| `top`, `right`, `bottom`, `left`, `inset` | `.modal-overlay { inset: 0 }`, `.toast-area`, `.dropdown` |
| `z-index` and stacking | One list of z-index variables at the top of `base.css` |
| `float` and `clear` | The picture in the welcome card floats right; `.clearfix::after { clear: both }` (`components.css`) |
| Flexbox and Grid (preferred for layout) | `.stats-grid`, `.grid-two`, `.form-grid` use Grid; `.page-header`, `.topbar`, `.item-row` use Flexbox |
| Responsive design (media queries) | End of `layout.css`: the sidebar becomes a slide-in menu on phones |
