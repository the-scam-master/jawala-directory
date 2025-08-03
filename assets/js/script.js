document.addEventListener('DOMContentLoaded', () => {
    const businessList = document.getElementById('businessList');
    const searchInput = document.getElementById('searchInput');
    const categoryGrid = document.getElementById('categoryGrid');
    const selectedCategoryName = document.getElementById('selectedCategoryName');
    const sortSelect = document.getElementById('sortSelect');
    let businessData = null;
    let selectedCategory = null;
    const loadingOverlay = document.getElementById('loadingOverlay');

    businessList.setAttribute('aria-live', 'polite');

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeModal = document.getElementById('closeModal');
    const darkToggle = document.getElementById('darkToggle');

    if (settingsBtn) settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
    if (closeModal) closeModal.addEventListener('click', () => settingsModal.classList.remove('show'));

    if (localStorage.getItem('dark') === 'true') {
        document.documentElement.classList.add('dark');
        if (darkToggle) darkToggle.checked = true;
    }
    if (darkToggle) darkToggle.addEventListener('change', () => {
        document.documentElement.classList.toggle('dark', darkToggle.checked);
        localStorage.setItem('dark', darkToggle.checked);
    });

    async function fetchBusinessData() {
        loadingOverlay.classList.add('active');
        try {
            const response = await fetch('./data/businesses.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            businessData = await response.json();

            if (!businessData.categories || !businessData.businesses) {
                throw new Error("Invalid data format: Missing categories or businesses");
            }

            renderCategoryGrid(businessData.categories);
            const params = new URLSearchParams(window.location.search);
            const catParam = params.get('cat');
            if (catParam) {
                const targetCard = Array.from(document.querySelectorAll('.category-item')).find(item => item.textContent.trim().includes(' ')? item.querySelector('span')?.textContent && businessData.categories.find(c=>c.id===catParam)?.name===item.querySelector('span').textContent : false);
                const categoryObj = businessData.categories.find(c=>c.id===catParam);
                if (categoryObj && targetCard) {
                    selectCategory(targetCard, categoryObj);
                }
            }
            renderBusinesses(businessData.businesses);
            loadingOverlay.classList.remove('active');
        } catch (error) {
            console.error('Error fetching business data:', error);
            loadingOverlay.classList.remove('active');
            businessList.innerHTML = `
                <div class="no-results">
                    <p>डेटा लोड करण्यात त्रुटी आली: ${error.message}</p>
                </div>`;
        }
    }

    function renderCategoryGrid(categories) {
        categoryGrid.innerHTML = '';

        const allCategoriesItem = createAllCategoriesItem();
        categoryGrid.appendChild(allCategoriesItem);

        const uniqueCategories = getUniqueCategories(categories);
        uniqueCategories.forEach(category => {
            const categoryItem = createCategoryItem(category);
            categoryGrid.appendChild(categoryItem);
        });
    }

    function createCategoryItem(category) {
        const categoryItem = document.createElement('div');
        categoryItem.classList.add('category-item');
        categoryItem.setAttribute('role','button');
        categoryItem.setAttribute('tabindex','0');
        categoryItem.innerHTML = `
            <i class="${category.icon}"></i>
            <span>${category.name}</span>
        `;

        categoryItem.addEventListener('click', () => {
            selectCategory(categoryItem, category);
        });
        categoryItem.addEventListener('keyup', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                selectCategory(categoryItem, category);
            }
        });

        return categoryItem;
    }

    function createAllCategoriesItem() {
        const allCategoriesItem = document.createElement('div');
        allCategoriesItem.classList.add('category-item');
        allCategoriesItem.innerHTML = `
            <i class="fas fa-th-large"></i>
            <span>सर्व श्रेण्या</span>
        `;

        allCategoriesItem.addEventListener('click', () => {
            selectAllCategories(allCategoriesItem);
        });

        return allCategoriesItem;
    }

    function getUniqueCategories(categories) {
        const seen = new Set();
        return categories.filter(category => {
            if (!seen.has(category.id)) {
                seen.add(category.id);
                return true;
            }
            return false;
        });
    }

    function selectCategory(categoryItem, category) {
        document.querySelectorAll('.category-item').forEach(item =>
            item.classList.remove('selected')
        );
        categoryItem.classList.add('selected');
        selectedCategory = category.id;

        document.querySelectorAll('.category-item').forEach((item, idx) => {
            const isAll = idx === 0;
            if (item !== categoryItem && !isAll) {
                item.classList.add('hidden');
            } else {
                item.classList.remove('hidden');
            }
        });

        selectedCategoryName.textContent = category.name;
        selectedCategoryName.style.opacity = '1';

        filterBusinesses();
        history.pushState({}, '', `?cat=${selectedCategory}`);
        businessList.scrollIntoView({ behavior: 'smooth' });
    }

    function selectAllCategories(allCategoriesItem) {
        document.querySelectorAll('.category-item').forEach(item =>
            item.classList.remove('selected')
        );
        allCategoriesItem.classList.add('selected');
        selectedCategory = null;
        document.querySelectorAll('.category-item').forEach(item => item.classList.remove('hidden'));
        selectedCategoryName.textContent = '';
        selectedCategoryName.style.opacity = '0';
        filterBusinesses();
        history.pushState({}, '', location.pathname);
        loadingOverlay.classList.remove('active');
    }

    function filterBusinesses() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const filteredBusinesses = businessData.businesses.filter(business => {
            const matchesCategory = !selectedCategory || business.category === selectedCategory;
            const matchesSearch = !searchTerm ||
                [business.shopName, business.ownerName, business.contactNumber]
                    .some(value => value.toLowerCase().includes(searchTerm));
            return matchesCategory && matchesSearch;
        });
        renderBusinesses(filteredBusinesses);
    }

    function renderBusinesses(businesses) {
        businessList.innerHTML = '';

        if (businesses.length === 0) {
            businessList.innerHTML = '<div class="no-results"><p>कोणतेही व्यवसाय सापडले नाहीत.</p></div>';
            return;
        }

        if (selectedCategory) {
            businesses.forEach(business => {
                const businessCard = createBusinessCard(business);
                businessList.appendChild(businessCard);
            });
            businessList.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        const groupedBusinesses = businesses.reduce((acc, business) => {
            if (!acc[business.category]) acc[business.category] = [];
            acc[business.category].push(business);
            return acc;
        }, {});

        for (const categoryId in groupedBusinesses) {
            const category = businessData.categories.find(cat => cat.id === categoryId);
            const categoryHeader = createCategoryHeader(category);
            businessList.appendChild(categoryHeader);

            groupedBusinesses[categoryId].forEach(business => {
                const businessCard = createBusinessCard(business);
                businessList.appendChild(businessCard);
            });
        }
    }

    function createCategoryHeader(category) {
        const categoryHeader = document.createElement('div');
        categoryHeader.classList.add('category-header');
        categoryHeader.innerHTML = `<i class="${category.icon}"></i> ${category.name}`;
        return categoryHeader;
    }

    function createBusinessCard(business) {
        const businessCard = document.createElement('div');
        businessCard.classList.add('business-card');
        businessCard.innerHTML = `
            <h4>${business.shopName}</h4>
            <p><strong>मालक:</strong> ${business.ownerName}</p>
            <div class="contact-row">
                <span><strong>संपर्क:</strong> <a class="tel" href="tel:${business.contactNumber}" aria-label="Call">${formatPhoneNumber(business.contactNumber)}</a></span>
                <a class="wa" href="https://wa.me/91${business.contactNumber}?text=${encodeURIComponent('नमस्कार, मी “जवळा व्यवसाय निर्देशिका” वरून आपला संपर्क घेतला आहे.') }" target="_blank" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                <button class="share" aria-label="Share"><i class="fas fa-share"></i></button>
            </div>`;

        businessCard.querySelector('.share').addEventListener('click', () => {
            const shareText = `${business.shopName}\nमालक: ${business.ownerName}\nसंपर्क: ${formatPhoneNumber(business.contactNumber)}\n\nजवळा व्यवसाय निर्देशिका – https://jawala-vyapar.vercel.app/`;
            navigator.clipboard.writeText(shareText).then(()=>{
                alert('विवरन कॉपी केले!');
            }).catch(()=>{});
            if (navigator.share) {
                navigator.share({
                    title: business.shopName,
                    text: shareText,
                    url: location.origin + `/?cat=${business.category}`
                }).catch(()=>{});
            }
        });

        return businessCard;
    }

    function formatPhoneNumber(phoneNumber) {
        if (phoneNumber.length === 10) {
            return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4, 7)} ${phoneNumber.slice(7)}`;
        }
        return phoneNumber;
    }

    searchInput.addEventListener('input', filterBusinesses);

    fetchBusinessData();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(console.error);
    }

    let deferredPrompt;
    const banner = document.getElementById('installBanner');
    const bannerBtn = document.getElementById('bannerInstallBtn');
    const footerBtn = document.getElementById('footerInstallBtn');
    const dismissBtn = document.getElementById('dismissInstall');

    if (bannerBtn) bannerBtn.addEventListener('click', triggerInstall);
    if (footerBtn) footerBtn.addEventListener('click', triggerInstall);
    if (dismissBtn) dismissBtn.addEventListener('click', ()=>banner.classList.remove('show'));

    function triggerInstall(){
        if (deferredPrompt){
            deferredPrompt.prompt();
            deferredPrompt.userChoice.finally(()=>{
                banner.classList.remove('show');
                deferredPrompt=null;
            });
        }
    }

    window.addEventListener('beforeinstallprompt', (e)=>{
        e.preventDefault();
        deferredPrompt = e;
        banner.classList.add('show');
    });

    document.addEventListener('keydown', event => {
        const blockedKeys = ['c', 'x', 'v', 'a', 's', 'u', 'p'];
        if ((event.ctrlKey || event.metaKey) && blockedKeys.includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
    });

    document.addEventListener('contextmenu', event => event.preventDefault());

    document.addEventListener('touchstart', event => {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    });
});
