export default function TestPage() {
  return (
    <div style={{background: "#111", color: "#fff", padding: "40px", fontFamily: "Arial, sans-serif", minHeight: "100vh"}}>
      <h1 style={{color: "#ff0000", fontSize: "48px"}}>TEST PAGE WORKS</h1>
      <p style={{fontSize: "24px"}}>If you can see this on the Fire Stick, basic rendering works.</p>
      <p style={{fontSize: "18px", color: "#999"}}>Vercel is serving pages. Now we know the issue is in the main page's code.</p>
    </div>
  );
}
