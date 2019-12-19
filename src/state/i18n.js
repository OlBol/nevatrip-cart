export default (store) => {
  store.on('@init', () => ({ i18n: {} }));

  store.on('i18n/load', ({ i18n }, lang) => {
    i18n[lang] = {
      date: 'Дата',
      yourOrder: 'Ваш заказ',
    };

    return { i18n };
  });
};
