const foods = [
    { name: 'กะเพราหมูสับไข่ดาวราดข้าว', country: 'THAILAND', category: 'THE THAI CLASSIC', description: 'หมูสับผัดกะเพราหอม ๆ รสจัดจ้าน เสิร์ฟพร้อมข้าวสวยและไข่ดาวกรอบนอก ไข่แดงเยิ้ม', price: 159, image: 'kaprao.png' },
    { name: 'Bratwurst', country: 'GERMANY', category: 'A GERMAN FAVOURITE', description: 'ไส้กรอกเยอรมันย่างหอม เนื้อแน่นฉ่ำ เสิร์ฟคู่มัสตาร์ดและเครื่องเคียงสไตล์ดั้งเดิม', price: 349, image: 'bratwurst.png' },
    { name: 'Katsudon', country: 'JAPAN', category: 'JAPANESE COMFORT', description: 'ข้าวหน้าหมูทอดกรอบ เคล้าซอสดาชิหอมหวาน หอมใหญ่และไข่นุ่ม อบอุ่นในทุกคำ', price: 189, image: 'katsudon.png' },
    { name: 'Hamburger', country: 'USA', category: 'THE AMERICAN ICON', description: 'เบอร์เกอร์เนื้อย่างฉ่ำ ชีสละมุนและผักสด ประกบด้วยขนมปังนุ่มอบหอม', price: 219, image: 'burger.png' },
    { name: 'Korean Fried Chicken', country: 'SOUTH KOREA', category: 'SEOUL SOUL FOOD', description: 'ไก่ทอดเกาหลีกรอบฉ่ำ เคลือบซอสหวานเผ็ดกลมกล่อม โรยงาหอม อร่อยจนหยุดไม่ได้', price: 269, image: 'koreanchic.png' }
];

'use strict';
const $ = id => document.getElementById(id);
const machine = document.querySelector('.machine');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const storageKey = 'foodpicker-itf-v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { }
let history = Array.isArray(saved.history) ? saved.history.filter(index => Number.isInteger(index) && foods[index]).slice(0, 5) : [];
let count = Number.isSafeInteger(saved.count) && saved.count >= 0 ? saved.count : 0;
let soundEnabled = saved.sound === true;
let spinning = false;
let audioContext;
let spinSound;
let visibleColumns = [];
function persist() { try { localStorage.setItem(storageKey, JSON.stringify({ history, count, sound: soundEnabled })); } catch { } }
function photo(food) {
    const img = document.createElement('img'); img.src = food.image; img.alt = food.name;
    img.addEventListener('error', () => { const message = document.createElement('span'); message.className = 'image-error'; message.textContent = 'โหลดรูปไม่สำเร็จ'; img.replaceWith(message); }, { once: true });
    return img;
}
function tile(index, winner = false) {
    const item = document.createElement('div'); item.className = 'tile' + (winner ? ' winner' : ''); item.dataset.food = index;
    item.append(photo(foods[index])); const name = document.createElement('span'); name.className = 'food-name'; name.textContent = foods[index].name; item.append(name); return item;
}
function makeStrip(indices, win = false) { const strip = document.createElement('div'); strip.className = 'strip'; indices.forEach((index, row) => strip.append(tile(index, win && row === 1))); return strip; }
function renderHistory() {
    $('count').textContent = `สุ่มแล้ว ${count} ครั้ง`; $('history').replaceChildren();
    if (!history.length) { const empty = document.createElement('div'); empty.className = 'empty-history'; empty.textContent = 'มื้อแรกของคุณกำลังรออยู่ · ลองให้มังกรเลือกดูสิ'; $('history').append(empty); }
    history.forEach(index => { const item = document.createElement('article'); item.className = 'history-item'; item.append(photo(foods[index])); const name = document.createElement('p'); name.textContent = foods[index].name; item.append(name); $('history').append(item); });
}
function renderSound() { $('sound').textContent = soundEnabled ? '♫ เสียง: เปิด' : '♫ เสียง: ปิด'; $('sound').setAttribute('aria-pressed', String(soundEnabled)); }
function unlockAudio() { if (!soundEnabled) return; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume().catch(() => { }); } catch { } }
function tone(frequency, duration = .08, volume = .025) {
    if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}
// Rejection sampling avoids modulo bias, including for non-power-of-two menu counts.
function randomFood() { const range = 4294967296; const limit = range - range % foods.length; const buffer = new Uint32Array(1); do { crypto.getRandomValues(buffer); } while (buffer[0] >= limit); return buffer[0] % foods.length; }
function celebration() {
    $('confetti').replaceChildren();
    if (!reducedMotion.matches) for (let i = 0; i < 28; i++) { const piece = document.createElement('i'); piece.style.left = `${(i * 37) % 100}%`; piece.style.setProperty('--drift', `${(i % 7 - 3) * 20}px`); piece.style.animationDelay = `${i % 5 * .07}s`; piece.addEventListener('animationend', () => piece.remove()); $('confetti').append(piece); }
    [523, 659, 784, 1047].forEach((note, i) => setTimeout(() => tone(note, .18, .035), i * 100));
}
function showResult(index) {
    const food = foods[index]; $('result-photo').replaceChildren(photo(food)); $('result-name').textContent = food.name; $('result-description').textContent = food.description;
    $('result-meta').textContent = `${food.country} · ${food.category} · ราคาอาหาร ${food.price} บาท`;
    $('result').showModal();
}
async function spin() {
    if (spinning || !foods.length) return;
    spinning = true; $('shuffle').disabled = true; $('again').disabled = true;
    if ($('result').open) $('result').close();
    machine.classList.remove('won'); machine.classList.add('spinning'); $('reels').setAttribute('aria-busy', 'true');
    $('button-text').textContent = 'มังกรกำลังเลือก…'; $('status').textContent = 'กำลังหมุนวงล้อ รอชมอาหารในแถวกลาง';
    unlockAudio(); tone(280); spinSound = setInterval(() => tone(150, .045, .012), 110);
    // Pick the actual winning food once. All subsequent random draws are decorative.
    const winner = randomFood();
    const finalColumns = Array.from({ length: 3 }, () => [randomFood(), winner, randomFood()]);
    try {
        await Promise.all(Array.from($('reels').children, async (reel, col) => {
            const final = finalColumns[col];
            const filler = Array.from({ length: reducedMotion.matches ? 3 : 27 + col * 5 }, randomFood);
            // Final rows sit at the start: translating the long strip down brings them into view.
            const indices = [...final, ...filler, ...visibleColumns[col]];
            const strip = makeStrip(indices); strip.setAttribute('aria-hidden', 'true'); reel.replaceChildren(strip);
            const distance = (indices.length - 3) / indices.length * 100;
            const animation = strip.animate([{ transform: `translateY(-${distance}%)` }, { transform: 'translateY(0)' }], { duration: reducedMotion.matches ? 180 + col * 60 : 2850 + col * 380, easing: 'cubic-bezier(.12,.64,.16,1)', fill: 'forwards' });
            await animation.finished;
            reel.replaceChildren(makeStrip(final, true)); animation.cancel(); tone(390 + col * 130, .12, .035);
        }));
        visibleColumns = finalColumns;
        history.unshift(winner); history = history.slice(0, 5); count++; persist(); renderHistory();
        machine.classList.add('won'); $('status').textContent = `มังกรเลือก ${foods[winner].name} ให้คุณแล้ว!`; celebration();
        await new Promise(resolve => setTimeout(resolve, reducedMotion.matches ? 80 : 350));
        showResult(winner);
    } catch (error) {
        visibleColumns = finalColumns; Array.from($('reels').children).forEach((reel, i) => reel.replaceChildren(makeStrip(finalColumns[i])));
        $('status').textContent = 'แอนิเมชันสะดุด กรุณาลองสุ่มอีกครั้ง'; console.error(error);
    } finally {
        clearInterval(spinSound); machine.classList.remove('spinning'); $('reels').setAttribute('aria-busy', 'false'); spinning = false; $('shuffle').disabled = !foods.length; $('again').disabled = false; $('button-text').textContent = 'ปั่นสุ่มอาหาร';
    }
}
$('shuffle').addEventListener('click', spin); $('again').addEventListener('click', spin);
$('sound').addEventListener('click', () => { soundEnabled = !soundEnabled; unlockAudio(); renderSound(); persist(); if (soundEnabled) tone(660); });
$('help').addEventListener('click', () => $('instructions').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
$('result').addEventListener('close', () => { if (!spinning) $('shuffle').focus(); });
if (foods.length) {
    visibleColumns = Array.from({ length: 3 }, (_, col) => Array.from({ length: 3 }, (_, row) => (col + row * 2) % foods.length));
    visibleColumns.forEach(indices => { const reel = document.createElement('div'); reel.className = 'reel'; reel.append(makeStrip(indices)); $('reels').append(reel); });
    foods.forEach(food => { const img = new Image(); img.src = food.image; });
} else { $('shuffle').disabled = true; $('status').textContent = 'ยังไม่มีข้อมูลอาหารสำหรับสุ่ม'; }
renderHistory(); renderSound();
