const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const money = (n: number) => currency.format(n);

export const round2 = (n: number) => Math.round(n * 100) / 100;
