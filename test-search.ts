async function search() {
  const res = await fetch('https://api.github.com/search/repositories?q=truemoney+gift+api');
  const data = await res.json();
  console.log(data.items?.slice(0, 5).map((i: any) => i.html_url));
}
search();
