const language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh-CN';
document.documentElement.lang = language;
for (const article of document.querySelectorAll('main > article[lang]')) {
  article.hidden = article.lang !== language;
  if (!article.hidden) document.title = article.dataset.title;
}
