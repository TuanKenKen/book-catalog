const { createApp, ref, computed, reactive, provide, inject } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

const books = [
  { id: 1, title: "1984", author: "George Orwell", genre: "Dystopian" },
  { id: 2, title: "To Kill a Mockingbird", author: "Harper Lee", genre: "Classic" },
  { id: 3, title: "The Hobbit", author: "J.R.R. Tolkien", genre: "Fantasy" },
  { id: 4, title: "Sapiens", author: "Yuval Noah Harari", genre: "Non-fiction" },
  { id: 5, title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "Classic" },
  { id: 6, title: "The Catcher in the Rye", author: "J.D. Salinger", genre: "Classic" },
];

const useStore = () => {
  const user = ref(JSON.parse(localStorage.getItem("loggedInUser")) || null);
  const users = ref(JSON.parse(localStorage.getItem("users")) || []);
  const cart = reactive([]);
  const likes = ref(JSON.parse(localStorage.getItem("likes")) || {});

  const saveLikes = () => {
    localStorage.setItem("likes", JSON.stringify(likes.value));
  };

  const register = (email, password) => {
    if (users.value.some(u => u.email === email)) {
      throw new Error("User already exists!");
    }
    users.value.push({ email, password });
    localStorage.setItem("users", JSON.stringify(users.value));
  };

  const login = (email, password) => {
    const found = users.value.find(u => u.email === email && u.password === password);
    if (!found) throw new Error("Invalid credentials");
    user.value = { email };
    localStorage.setItem("loggedInUser", JSON.stringify(user.value));
  };

  const logout = () => {
    user.value = null;
    localStorage.removeItem("loggedInUser");
    cart.splice(0);
  };

  const addToCart = (book) => {
    if (!user.value) return alert("Login to add to cart");
    if (!cart.find(b => b.id === book.id)) cart.push(book);
  };

  const clearCart = () => cart.splice(0);

  const toggleLike = (bookId) => {
    if (!user.value) return alert("Login to like a book");
    const userEmail = user.value.email;
    if (!likes.value[bookId]) likes.value[bookId] = [];
    const alreadyLiked = likes.value[bookId].includes(userEmail);
    if (alreadyLiked) {
      likes.value[bookId] = likes.value[bookId].filter(e => e !== userEmail);
    } else {
      likes.value[bookId].push(userEmail);
    }
    saveLikes();
  };

  const hasLiked = (bookId) => {
    if (!user.value) return false;
    return likes.value[bookId]?.includes(user.value.email);
  };

  const getLikeCount = (bookId) => {
    return likes.value[bookId]?.length || 0;
  };

  return { user, users, cart, register, login, logout, addToCart, clearCart, toggleLike, hasLiked, getLikeCount };
};

const NavBar = {
  template: `
    <nav class="d-flex justify-content-between mb-4">
      <div>
        <router-link to="/" class="btn btn-outline-dark me-2" aria-label="Go to Home">Home</router-link>
        <router-link v-if="user" to="/cart" class="btn btn-outline-success me-2" aria-label="Go to Cart">🛒 Cart ({{ cart.length }})</router-link>
      </div>
      <div>
        <span v-if="user" class="me-2">👤 {{ user.email }}</span>
        <router-link v-if="!user" to="/login" class="btn btn-outline-primary me-2">Login</router-link>
        <router-link v-if="!user" to="/register" class="btn btn-outline-secondary me-2">Register</router-link>
        <button v-if="user" class="btn btn-danger" @click="logout">Logout</button>
      </div>
    </nav>
  `,
  setup() {
    const { user, cart, logout } = inject("store");
    return { user, cart, logout };
  }
};

const Home = {
  template: `
    <div>
      <h2 class="mb-3">Book Catalog</h2>
      <div class="d-flex mb-3 gap-2">
        <input class="form-control" v-model="searchQuery" placeholder="Search books..." />
        <select class="form-select w-auto" v-model="selectedGenre">
          <option value="">All</option>
          <option v-for="genre in genres" :key="genre">{{ genre }}</option>
        </select>
      </div>
      <div class="row">
        <div class="col-md-4 mb-3" v-for="book in filteredBooks" :key="book.id">
          <div class="card h-100">
            <div class="card-body">
              <h5 class="card-title">{{ book.title }}</h5>
              <p class="card-text">Author: {{ book.author }}</p>
              <p class="card-text">Genre: {{ book.genre }}</p>
              <div class="d-flex justify-content-between align-items-center">
                <button v-if="user" class="btn btn-sm btn-primary" :disabled="cart.some(b => b.id === book.id)" @click="addToCart(book)" :aria-label="cart.some(b => b.id === book.id) ? 'Already in Cart' : 'Add to Cart'" :title="cart.some(b => b.id === book.id) ? 'Already in Cart' : 'Add to Cart'">
                  {{ cart.some(b => b.id === book.id) ? "Added" : "Add to Cart" }}
                </button>
                <p v-else class="text-muted small">Login to add to cart</p>
                <button class="btn btn-sm" :class="hasLiked(book.id) ? 'btn-success' : 'btn-outline-secondary'" @click="toggleLike(book.id)" :aria-label="hasLiked(book.id) ? 'Unlike this book' : 'Like this book'" :title="hasLiked(book.id) ? 'Unlike this book' : 'Like this book'">
                  ❤️ {{ getLikeCount(book.id) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    const searchQuery = ref("");
    const selectedGenre = ref("");
    const genres = [...new Set(books.map(b => b.genre))];

    const filteredBooks = computed(() =>
      books.filter(b =>
        b.title.toLowerCase().includes(searchQuery.value.toLowerCase()) &&
        (!selectedGenre.value || b.genre === selectedGenre.value)
      )
    );

    const { cart, user, addToCart, hasLiked, toggleLike, getLikeCount } = inject("store");
    return { searchQuery, selectedGenre, genres, filteredBooks, cart, user, addToCart, hasLiked, toggleLike, getLikeCount };
  }
};

const Register = {
  template: `
    <div class="col-md-6 offset-md-3">
      <h2>Register</h2>
      <form @submit.prevent="submit">
        <div class="mb-3">
          <label>Email</label>
          <input type="email" v-model="email" class="form-control" required />
        </div>
        <div class="mb-3">
          <label>Password</label>
          <input type="password" v-model="password" class="form-control" required />
        </div>
        <button class="btn btn-secondary">Register</button>
        <div class="text-danger mt-2" v-if="error" role="alert">{{ error }}</div>
      </form>
    </div>
  `,
  setup() {
    const email = ref(""), password = ref(""), error = ref("");
    const { register } = inject("store");

    const submit = () => {
      try {
        register(email.value, password.value);
        alert("Registered successfully");
        window.location.hash = "#/login";
      } catch (e) {
        error.value = e.message;
      }
    };
    return { email, password, error, submit };
  }
};

const Login = {
  template: `
    <div class="col-md-6 offset-md-3">
      <h2>Login</h2>
      <form @submit.prevent="submit">
        <div class="mb-3">
          <label>Email</label>
          <input type="mail" v-model="email" class="form-control" required />
        </div>
        <div class="mb-3">
          <label>Password</label>
          <input type="password" v-model="password" class="form-control" required />
        </div>
        <button class="btn btn-primary">Login</button>
        <div class="text-danger mt-2" v-if="error">{{ error }}</div>
      </form>
    </div>
  `,
  setup() {
    const email = ref(""), password = ref(""), error = ref("");
    const { login } = inject("store");

    const submit = () => {
      try {
        login(email.value, password.value);
        alert("Login successful");
        window.location.hash = "#/";
      } catch (e) {
        error.value = e.message;
      }
    };
    return { email, password, error, submit };
  }
};

const Cart = {
  template: `
    <div>
      <h2>Your Cart</h2>
      <ul class="list-group mb-3" v-if="cart.length">
        <li class="list-group-item d-flex justify-content-between" v-for="book in cart" :key="book.id">
          <span>{{ book.title }}</span>
          <span class="badge bg-secondary">{{ book.genre }}</span>
        </li>
      </ul>
      <p v-else>Your cart is empty.</p>
      <button class="btn btn-success" v-if="cart.length" @click="checkout">Proceed to Payment</button>
    </div>
  `,
  setup() {
    const { cart, clearCart } = inject("store");
    const checkout = () => {
      alert("Payment successful!");
      clearCart();
    };
    return { cart, checkout };
  }
};

const routes = [
  { path: "/", component: Home },
  { path: "/register", component: Register },
  { path: "/login", component: Login },
  { path: "/cart", component: Cart }
];

const router = createRouter({ history: createWebHashHistory(), routes });

const app = createApp({
  components: { NavBar },
  template: `
    <div class="container my-4">
      <NavBar />
      <router-view />
    </div>
  `,
  setup() {
    provide("store", useStore());
  }
});
app.use(router);
app.mount("#app");
