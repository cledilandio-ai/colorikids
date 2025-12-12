
// Using native fetch (Node 18+)
async function testSearch(term) {
    console.log(`Searching for: "${term}"...`);
    try {
        const res = await fetch(`http://localhost:3000/api/products?search=${term}`);
        if (res.ok) {
            const data = await res.json();
            console.log(`Found ${data.length} results.`);
            data.forEach(p => console.log(` - ${p.name}`));
        } else {
            console.error(`Error: ${res.status} ${res.statusText}`);
        }
    } catch (e) {
        console.error("Connection error:", e.message);
    }
}

// Run test
testSearch("Vestido");
