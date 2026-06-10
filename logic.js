import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs, where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTxyr3zJGsyfmdztvfFz8aw9XSyPCNeQM",
  authDomain: "nestmate-ai.firebaseapp.com",
  projectId: "nestmate-ai",
  storageBucket: "nestmate-ai.firebasestorage.app",
  messagingSenderId: "7053398074",
  appId: "1:7053398074:web:13dc18b49402d95107a503"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.auth = auth;
window.db = db;
window.dbTools = { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs, where };
window.handleLogout = () => signOut(auth);

// ── SESSION STATE LISTENER ──
onAuthStateChanged(auth, (user) => {
  const shell = document.querySelector('.page-shell');
  const overlay = document.getElementById('auth-overlay');
  if (user) {
    overlay.style.display = 'none';
    shell.style.visibility = 'visible';
    shell.style.opacity = '1';
    shell.style.transition = 'opacity 0.3s ease';
    if (typeof window.loadProperties === "function") window.loadProperties();
    setTimeout(() => {
      document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
    }, 150);
  } else {
    window.location.href = "login.html";
  }
});

// ── FETCH AND RENDER USER'S SPECIFIC ENTRIES ──
async function renderMyListingsGrid() {
  const grid = document.getElementById('myListingsGrid');
  if (!grid) return;

  if (!grid.innerHTML || grid.innerHTML.includes('You haven\'t published') || grid.innerHTML.includes('Loading')) {
    grid.innerHTML = '<p class="modal-status-text">Loading your spaces...</p>';
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    grid.innerHTML = '<p class="modal-status-error">Please log in to view your listings.</p>';
    return;
  }

  try {
    const q = query(collection(db, "properties"), where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    const modal = document.getElementById('myListingsModal');
    if (modal && modal.style.display !== 'flex') return;

    grid.innerHTML = ''; 

    if (querySnapshot.empty) {
      grid.innerHTML = '<p class="modal-status-empty">You haven\'t published any spaces yet.</p>';
      return;
    }

    let activeDuration = 'day'; 
    const activeToggleBtn = document.querySelector('.toggle-group .toggle-btn.active');
    if (activeToggleBtn) {
      const btnText = activeToggleBtn.textContent.trim().toLowerCase();
      if (btnText.includes('week')) activeDuration = 'week';
      else if (btnText.includes('month')) activeDuration = 'month';
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      
      const imageUrl = data.image || data.imageUrl || data.img || data.propertyImage || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600";
      let basePrice = parseFloat(data.price || data.weeklyRent || data.rent || data.modalPropPrice || 0);
      
      if (basePrice === 0) {
         const trackCards = document.querySelectorAll('#carouselTrack .property-card, #carouselTrack div, .explore-section div');
         trackCards.forEach(card => {
            if (card.textContent.includes(data.name)) {
               const numbersFound = card.textContent.match(/\d+/g);
               if (numbersFound && numbersFound.length > 0) {
                  const detectedNum = parseInt(numbersFound[0]);
                  if (activeDuration === 'day') basePrice = detectedNum * 7;
                  else if (activeDuration === 'month') basePrice = detectedNum / 4.33;
                  else basePrice = detectedNum;
               }
            }
         });
      }

      let displayedPriceText = "";
      if (activeDuration === 'day') {
        const dayPrice = basePrice > 0 ? Math.round(basePrice / 7) : 0;
        displayedPriceText = `£${dayPrice} / Day`;
      } else if (activeDuration === 'month') {
        const monthPrice = basePrice > 0 ? Math.round(basePrice * 4.33) : 0;
        displayedPriceText = `£${monthPrice} / Month`;
      } else {
        displayedPriceText = `£${Math.round(basePrice)} / Week`;
      }

      const card = document.createElement('div');
      card.className = 'my-listing-row-card';

      card.innerHTML = `
        <div class="my-listing-image-thumb">
          <img src="${imageUrl}">
        </div>
        <div class="my-listing-details-box">
          <div class="my-listing-title">${data.name || 'Unnamed Property'}</div>
          <div class="my-listing-subtext">
            📍 ${data.address || 'No Address'}<br>
            💰 Rent: ${displayedPriceText} | 📞 ${data.phone || 'No Phone'}
          </div>
        </div>
        <button class="delete-listing-btn">Delete</button>
      `;

      card.querySelector('.delete-listing-btn').addEventListener('click', async (e) => {
        if (confirm("Are you sure you want to permanently delete this listing?")) {
          try {
            e.target.disabled = true;
            e.target.textContent = "Deleting...";
            await deleteDoc(doc(db, "properties", docId));
            renderMyListingsGrid(); 
          } catch (err) {
            console.error("Error removing document:", err);
            alert("Could not remove property. Check network privileges.");
            e.target.disabled = false;
            e.target.textContent = "Delete";
          }
        }
      });

      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Fault retrieving user portfolio entries:", error);
    grid.innerHTML = '<p class="modal-status-error">Failed to load listings.</p>';
  }
}

// ── CONTROL HOOK INTERFACES FOR MAIN LAYOUT BUTTONS ──
window.myListings = function() {
  const modal = document.getElementById('myListingsModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    renderMyListingsGrid();
  }
};

window.closeMyListings = function() {
  const modal = document.getElementById('myListingsModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
  }
};

document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('toggle-btn')) {
    setTimeout(() => {
      const modal = document.getElementById('myListingsModal');
      if (modal && modal.style.display === 'flex') {
        renderMyListingsGrid();
      }
    }, 50);
  }
});

// ── CREATE NEW ENTRIES IN FIRESTORE COLLECTION ──
window.modalUploadProperty = async function() {
  const name = document.getElementById('modalPropName').value.trim();
  const price = document.getElementById('modalPropPrice').value.trim();
  const phone = document.getElementById('modalPropPhone').value.trim();
  const address = document.getElementById('modalPropAddress').value.trim();
  const statusText = document.getElementById('modalUploadStatus');

  if (!name || !price || !phone || !address) {
    alert("⚠ Please fill in all fields before publishing.");
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("⚠ Critical session mismatch. Please log in again.");
    return;
  }

  try {
    statusText.className = "status-loading";
    statusText.textContent = "Publishing to cloud...";

    const parsedPrice = parseFloat(price);

    await addDoc(collection(db, "properties"), {
      name: name,
      price: parsedPrice,
      weeklyRent: parsedPrice,
      rent: parsedPrice,
      modalPropPrice: parsedPrice,
      phone: phone,
      address: address,
      userId: currentUser.uid,
      email: currentUser.email,
      createdAt: new Date(),
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600" 
    });

    statusText.className = "status-success";
    statusText.textContent = "Space successfully published!";
    
    document.getElementById('modalPropName').value = '';
    document.getElementById('modalPropPrice').value = '';
    document.getElementById('modalPropPhone').value = '';
    document.getElementById('modalPropAddress').value = '';

    renderMyListingsGrid();
  } catch (err) {
    console.error("Listing publish process failure:", err);
    statusText.className = "status-error";
    statusText.textContent = "Upload failed. Try again.";
  }
};