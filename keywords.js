/**
 * Categorized keywords for Decodo Intelligence Scraper
 */
const CATEGORIES = {
  "Countries": [
    "India", "China", "Africa", "South Africa", "Iran", "Pakistan", "Ghana", "Singapore",
    "Hongkong", "Russia", "Japan", "Tokyo", "Israel", "Bangladesh", "Nepal", "Sri Lanka",
    "Afghanistan", "Myanmar", "Cambodia", "Laos", "Thailand", "Vietnam", "Indonesia",
    "Malaysia", "Philippines", "Taiwan", "Hong Kong", "United Arab Emirates", "UAE",
    "Saudi Arabia", "Turkey", "Türkiye", "Nigeria", "Kenya", "Egypt", "Ukraine",
    "United States", "USA", "United Kingdom", "UK", "Canada", "Australia", "Germany",
    "France", "Brazil", "Mexico"
  ],
  "Regions": [
    "Delhi", "Gujarat", "Uttarakhand", "Tamil Nadu", "Tamilnadu", "Rajasthan",
    "Ahmedabad", "Kerela", "Bihar", "Gurugram", "Haryana", "Bangalore", "Karnataka",
    "Indore", "Madhya Pradesh", "Lucknow", "Uttar Pradesh", "Mumbai", "Maharashtra",
    "Pune", "Hyderabad", "Telangana", "Chennai"
  ],
  "Generic keywords": [
    "Defence", "Bank", "Redliner", "Logs", "Airport", "Marine", "Maritime", "Police",
    "Military", "APK", "Loan", "Loot", "Payment", "Crypto", "Betting", "Bet", "Money",
    "Download", "Link", "FBI", "WeChat", "Facebook", "Instagram"
  ],
  "Crypto-financial terms": [
    "USDT", "BTC", "ETH", "Alipay", "Paytm", "HDFC", "SBI", "IDFC", "Bitcoin",
    "Ethereum", "Tether", "TRC20", "ERC20", "BEP20", "OTC", "Binance", "Trust Wallet", "MetaMask"
  ],
  "Terror Groups": [
    "Tehreek-e-Taliban", "Al Qaeda", "ISIS", "Techhaven", "Al-Andalus",
    "Al-jihad-al-saybarani", "Jihad", "Fursan Al Sham", "مؤسسة الأندلس للإنتاج الإعلامي"
  ],
  "Drugs, weapons, and illicit goods": [
    "Drug", "Narcotics", "Drug delivery", "Cocaine", "Heroin", "Methamphetamine",
    "MDMA", "Ecstasy", "Mephedrone", "Fentanyl", "Illegal prescription drugs",
    "Counterfeit medicine", "Weapons", "Illegal firearms", "Gun sale", "Ammunition"
  ],
  "Piracy and stolen digital products": [
    "Pirated software", "Cracked software", "Software crack", "License key",
    "Streaming account", "IPTV", "Leaked course", "Paid course leak", "Ebook",
    "Movie", "Game account", "Gaming currency", "Gift card"
  ]
};

// Flatten all unique keywords preserving order
const flatKeywords = Array.from(
  new Set(Object.values(CATEGORIES).flat().map(k => k.trim()))
);

flatKeywords.categories = CATEGORIES;

module.exports = flatKeywords;
