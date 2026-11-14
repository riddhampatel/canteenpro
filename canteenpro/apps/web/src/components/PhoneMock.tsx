/** Pure-HTML phone mock of the employee app home screen. */
export function PhoneMock() {
  const items = [
    { n: "Executive veg thali", p: "₹40", k: "720 kcal", veg: true },
    { n: "Chicken curry meal", p: "₹70", k: "820 kcal", veg: false },
    { n: "Dal tadka & jeera rice", p: "₹40", k: "540 kcal", veg: true },
  ];
  return (
    <div className="mx-auto w-75 rounded-[44px] border-10 border-navy-900 bg-white shadow-2xl shadow-navy-900/30">
      <div className="px-5 pb-6 pt-8">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-extrabold text-navy-800">
            Dinesh Caterers
          </span>
          <span className="h-2.5 w-2.5 rounded-full bg-turmeric" />
        </div>
        <div className="mt-4 rounded-2xl bg-leaf-50 p-4">
          <p className="text-[15px] font-bold">Having lunch today?</p>
          <p className="text-[13px] text-navy-600">Closes at 10:30 am</p>
          <div className="mt-3 flex rounded-full bg-white p-1 text-sm font-semibold">
            <span className="flex-1 py-1.5 text-center text-navy-400">
              Not eating
            </span>
            <span className="flex-1 rounded-full bg-leaf py-1.5 text-center text-white">
              Eating
            </span>
          </div>
        </div>
        <p className="mt-5 font-display text-lg font-bold">Today’s lunch</p>
        <div className="mt-2 space-y-2">
          {items.map((i) => (
            <div
              key={i.n}
              className="flex items-center gap-3 rounded-2xl border border-steel p-2.5"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-turmeric-50 text-lg">
                🍛
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold">
                  <span
                    className={`h-2 w-2 rounded-full ${i.veg ? "bg-leaf" : "bg-red-600"}`}
                  />
                  {i.n}
                </div>
                <div className="text-[12px] text-navy-400">{i.k}</div>
              </div>
              <span className="text-[14px] font-bold">{i.p}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-navy-800 p-4 text-white">
          <p className="text-[13px] text-navy-200">Canteen wallet</p>
          <p className="font-display text-2xl font-extrabold">₹1,260.00</p>
        </div>
      </div>
    </div>
  );
}
