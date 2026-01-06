const tg = window.Telegram.WebApp
const apiBaseUrl = 'https://api.s.tkgn.ru/api/'
const groupSelect = document.getElementById('groupSelect')
const groupSelectText = document.getElementById('groupSelectText')
const groupDropdown = document.getElementById('groupDropdown')
const groupError = document.getElementById('groupError')

const servicesContainer = document.getElementById('servicesContainer')
const serviceSelect = document.getElementById('serviceSelect')
const serviceSelectText = document.getElementById('serviceSelectText')
const serviceDropdown = document.getElementById('serviceDropdown')
const serviceError = document.getElementById('serviceError')
const serviceDescription = document.getElementById('serviceDescription')

const rateContainer = document.getElementById('rateContainer')
const ratingWrap = document.getElementById('rating')
const ratingStars = document.querySelectorAll('.star')
const ratingError = document.getElementById('ratingError')

const textContainer = document.getElementById('textContainer')
const feedbackText = document.getElementById('feedbackText')

const submitFeedback = document.getElementById('submitFeedback')
const loadingEl = document.getElementById('loading')
const loadingMsg = document.getElementById('loadingMessage')
const errorMessageEl = document.getElementById('errorMessage')

const themeToggle = document.getElementById('themeToggle')
const themeIcon = document.getElementById('themeIcon')

const stepper = document.getElementById('stepper')

let selectedGroupId = null
let selectedServiceId = null
let selectedRating = null
const serviceDetailsCache = new Map()

document.addEventListener('DOMContentLoaded', () => {
  initTelegram()
  bindTheme()
  bindGlobalBlur()
  fetchGroups()
  updateSteps(1)
})

function initTelegram(){
  try{
    tg.ready(); tg.expand()
    tg.MainButton.setParams({ text: 'Закрыть приложение', is_visible: true })
    tg.MainButton.onClick(() => tg.close())
    tg.MainButton.show()
  }catch{}
}

function bindTheme(){
  updateThemeIcon()
  themeToggle.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', isDark)
    try{ localStorage.setItem('theme', isDark ? 'dark' : 'light'); localStorage.setItem('themeOverride','user') }catch{}
    updateThemeIcon()
  })
  try{
    const saved = localStorage.getItem('theme')
    const override = localStorage.getItem('themeOverride')
    if (override === 'user' && saved) document.documentElement.classList.toggle('dark', saved === 'dark')
  }catch{}
}
function updateThemeIcon(){
  const isDark = document.documentElement.classList.contains('dark')
  themeIcon.textContent = isDark ? '☀️' : '🌙'
}

// Blur textarea when tapping/clicking outside; Enter now inserts newline by default
function bindGlobalBlur(){
  document.addEventListener('pointerdown', (e) => {
    const active = document.activeElement
    if (active === feedbackText) {
      const inside = e.target === feedbackText || feedbackText.contains(e.target)
      if (!inside) feedbackText.blur()
    }
  })
}

function updateSteps(step){
  stepper.querySelectorAll('.step-dot').forEach((el, idx) => {
    const i = idx + 1
    if (i < step) { el.classList.remove('opacity-60'); el.classList.add('border-brand'); }
    else if (i === step) { el.classList.remove('opacity-60'); el.classList.add('border-brand'); }
    else { el.classList.add('opacity-60'); el.classList.remove('border-brand'); }
  })
  if (step >= 3) { rateContainer.classList.remove('opacity-60','pointer-events-none') }
  if (step >= 4) { textContainer.classList.remove('opacity-60','pointer-events-none') }
}

function toggleList(el){ el.classList.toggle('hidden') }
function closeLists(except){
  if (except !== groupDropdown) groupDropdown.classList.add('hidden')
  if (except !== serviceDropdown) serviceDropdown.classList.add('hidden')
}

groupSelect.addEventListener('click', () => { closeLists(groupDropdown); toggleList(groupDropdown) })
serviceSelect.addEventListener('click', () => { if (selectedGroupId) { closeLists(serviceDropdown); toggleList(serviceDropdown) } })

document.addEventListener('click', (e) => {
  const inside = e.target.closest('#groupSelect, #groupDropdown, #serviceSelect, #serviceDropdown')
  if (!inside) closeLists(null)
})

async function fetchGroups(){
  try{
    const r = await fetch(apiBaseUrl + 'groups', { method:'POST', headers:{'Content-Type':'application/json'} })
    const groups = await r.json()
    groupDropdown.innerHTML = ''
    groups.forEach(g => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition border-b last:border-b-0 border-slate-100 dark:border-slate-800 touch-no-hover touch-no-focus'
      btn.dataset.groupId = g.groupID
      btn.textContent = g.name
      btn.addEventListener('click', () => onGroupSelect(g.groupID, g.name))
      groupDropdown.appendChild(btn)
    })
    groupSelectText.textContent = 'Выберите группу'
    groupSelect.disabled = false
  }catch{
    groupSelectText.textContent = 'Ошибка загрузки групп'
  }
}

function onGroupSelect(id, name){
  selectedGroupId = id
  groupSelectText.textContent = name
  groupDropdown.classList.add('hidden')
  serviceSelect.disabled = false
  serviceSelectText.textContent = 'Выберите услугу'
  serviceDropdown.innerHTML = ''
  serviceDescription.classList.add('hidden')
  feedbackText.value = ''
  feedbackText.disabled = true
  rateContainer.classList.add('opacity-60','pointer-events-none')
  textContainer.classList.add('opacity-60','pointer-events-none')
  servicesContainer.classList.remove('opacity-60','pointer-events-none')
  ratingStars.forEach(s => s.classList.remove('text-brand'))
  selectedServiceId = null
  selectedRating = null
  submitFeedback.disabled = true
  updateSteps(2)
  fetchServices(id)
}

async function fetchServices(groupId){
  try{
    const r = await fetch(`${apiBaseUrl}services/${groupId}`, { method:'POST', headers:{'Content-Type':'application/json'} })
    if(!r.ok) throw new Error('bad')
    const services = await r.json()
    serviceDropdown.innerHTML = ''
    services.forEach(s => {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition border-b last:border-b-0 border-slate-100 dark:border-slate-800 touch-no-hover touch-no-focus'
      item.dataset.serviceId = s.servicesID
      item.dataset.shortDescription = s.shortDescription || 'Услуга'
      item.dataset.contactPerson = s.contactPerson || ''
      item.innerHTML = `<div class="font-medium text-brand">${escapeHTML(item.dataset.shortDescription)}</div>${s.contactPerson?`<div class="text-sm text-slate-500">${escapeHTML(s.contactPerson)}</div>`:''}`
      item.addEventListener('click', () => onServicePick(item))
      serviceDropdown.appendChild(item)
    })
  }catch{
    serviceSelectText.textContent = 'Ошибка загрузки услуг'
  }
}

function onServicePick(btn){
  selectedServiceId = btn.dataset.serviceId
  serviceSelectText.textContent = `${btn.dataset.shortDescription}, ${btn.dataset.contactPerson}`.replace(/,\s*$/, '')
  serviceDropdown.classList.add('hidden')
  fetchServiceDetails(selectedServiceId)
  updateSubmitButtonState()
  updateSteps(3)
}

async function fetchServiceDetails(serviceId){
  if (!serviceId || isNaN(serviceId)) return
  serviceSelectText.textContent = 'Загрузка...'
  serviceDescription.classList.remove('hidden')
  serviceDescription.innerHTML = `<div class="flex items-center gap-2 text-slate-500 text-sm"><div class="w-5 h-5 border-2 border-slate-300 dark:border-slate-700 border-t-brand rounded-full animate-spin"></div><span>Загрузка...</span></div>`
  try{
    const r = await fetch(`${apiBaseUrl}service_details/${serviceId}`, { method:'POST', headers:{'Content-Type':'application/json'} })
    if(!r.ok) throw new Error('bad')
    const s = await r.json()
    serviceDetailsCache.set(serviceId, s)
    serviceSelectText.textContent = `${s.shortDescription}, ${s.contactPerson}`.replace(/,\s*$/, '')
    serviceDescription.innerHTML = renderServiceDetails(s)
    rateContainer.classList.remove('opacity-60','pointer-events-none')
    textContainer.classList.remove('opacity-60','pointer-events-none')
    feedbackText.disabled = false
    updateSteps(4)
  }catch{
    serviceDescription.innerHTML = `<p class="text-sm text-red-600">Ошибка при загрузке данных услуги.</p>`
  }
}

function renderServiceDetails(service){
  const desc = service.service ? `<div class="mt-2"><p class="font-medium">Описание услуги</p><div class="text-sm whitespace-pre-wrap">${linkify(service.service)}</div></div>` : ''
  const contacts = service.contacts ? `<div class="mt-2"><p class="font-medium">Контакты</p><div class="text-sm whitespace-pre-wrap">${formatPhoneNumbers(String(service.contacts).replace(/\n/g,'\n'))}</div></div>` : ''
  return `<div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3"><h3 class="text-base font-semibold text-brand">🛠 ${escapeHTML(service.shortDescription||'Услуга')}</h3><div class="mt-2"><p class="font-medium">Контактное лицо</p><div class="text-sm">${escapeHTML(service.contactPerson||'')}</div></div>${desc}${contacts}</div>`
}

ratingStars.forEach(star => {
  star.addEventListener('click', () => {
    selectedRating = Number(star.dataset.value)
    ratingStars.forEach(s => s.classList.remove('text-brand'))
    for (let i = 0; i < selectedRating; i++) ratingStars[i].classList.add('text-brand')
    ratingError.classList.add('hidden')
    updateSubmitButtonState()
  })
})

feedbackText.addEventListener('input', updateSubmitButtonState)

function updateSubmitButtonState(){
  submitFeedback.disabled = !(selectedServiceId && selectedRating)
}

submitFeedback.addEventListener('click', async () => {
  groupError.classList.add('hidden')
  serviceError.classList.add('hidden')
  ratingError.classList.add('hidden')
  errorMessageEl.classList.add('hidden')
  if (!selectedGroupId) { groupError.classList.remove('hidden'); return }
  if (!selectedServiceId) { serviceError.classList.remove('hidden'); return }
  if (!selectedRating) { ratingError.classList.remove('hidden'); return }
  loadingEl.classList.remove('hidden')
  loadingMsg.textContent = 'Пожалуйста, подождите...'
  try{
    const payload = { dataId:'new_feedback', serviceId:selectedServiceId, rating:selectedRating, text:feedbackText.value.trim() }
    tg.sendData(JSON.stringify(payload))
    loadingMsg.textContent = 'Оценка успешно отправлена! Закрытие...'
    tg.close()
  }catch{
    loadingEl.classList.add('hidden')
    errorMessageEl.textContent = 'Что-то пошло не так. Попробуйте позже.'
    errorMessageEl.classList.remove('hidden')
  }finally{
    loadingEl.classList.add('hidden')
  }
})

function escapeHTML(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;') }
function linkify(text){
  const esc = escapeHTML(String(text||''))
  const urlRe = /\b((?:https?:\/\/|ftp:\/\/)[^\s<>"']+|www\.[^\s<>"']+)/gi
  return esc.replace(urlRe, (m) => { const href = m.startsWith('http')||m.startsWith('ftp')? m : ('https://'+m); return `<a class="underline underline-offset-2 break-anywhere text-brand" href="${href}" target="_blank" rel="noopener noreferrer">${m}</a>` })
}
function formatPhoneNumbers(text){
  const lines = String(text||'').split('\n')
  return lines.map(l=>{
    const t=l.trim()
    const num=t.replace(/[^\d+]/g,'')
    if(num.length>=7){ return `<a class="underline underline-offset-2 text-brand" href="tel:${escapeHTML(num)}">${escapeHTML(t)}</a>` }
    return escapeHTML(t)
  }).join('<br>')
}
