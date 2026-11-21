function translate(){const lang=window.AINLanguage?.read()||'es';document.documentElement.lang=lang;for(const el of document.querySelectorAll('[data-es][data-en]'))el.textContent=el.dataset[lang];}
translate();window.addEventListener('ainimation:language',translate);
