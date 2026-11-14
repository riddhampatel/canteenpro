import Link from "next/link";

export function CtaBand({
  title = "Run your canteen without the register",
  text = "Set up meal sessions, import employees and serve your first QR meal today. Free for 14 days.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="bg-navy-800">
      <div className="wrap flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-center md:py-20">
        <div className="max-w-2xl">
          {/* <h2 className="text-3xl font-extrabold text-white md:text-[44px]">
            {title}
          </h2> */}
          <h2
            className="text-3xl font-extrabold md:text-[44px]"
            style={{
              color: "#ffffff",
              display: "block",
              visibility: "visible",
              opacity: 1,
            }}
          >
            {title}
          </h2>
          <p className="mt-3 text-lg text-navy-200">{text}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">
            Start free trial
          </Link>
          <Link
            href="/demo"
            className="btn border border-white/30 text-white hover:border-white"
          >
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
}







// CtaBand.jsx 

// import Link from "next/link";

// export function CtaBand({
//   title = "Run your canteen without the register",
//   text = "Set up meal sessions, import employees and serve your first QR meal today. Free for 14 days.",
// }) {
//   return (
//     <section className="bg-navy-800">
//       <div className="wrap flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-center md:py-20">
//         <div className="max-w-2xl">
//           <h2
//             className="text-3xl font-extrabold md:text-[44px]"
//             style={{
//               color: "#ffffff",
//               display: "block",
//               visibility: "visible",
//               opacity: 1,
//             }}
//           >
//             {title}
//           </h2>

//           <p className="mt-3 text-lg text-navy-200">
//             {text}
//           </p>
//         </div>

//         <div className="flex flex-wrap gap-3">
//           <Link href="/signup" className="btn-primary">
//             Start free trial
//           </Link>

//           <Link
//             href="/demo"
//             className="btn border border-white/30 text-white hover:border-white"
//           >
//             Book a demo
//           </Link>
//         </div>
//       </div>
//     </section>
//   );
// }
