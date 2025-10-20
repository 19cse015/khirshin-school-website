// Image slider
let images = ["/images/school1.jpg","/images/school2.jpg","/images/school3.jpg","/images/pic5.jpg"];
let index = 0;
let slideImage = document.getElementById("slideImage");
setInterval(() => {
  index = (index+1) % images.length;
  slideImage.src = images[index];
}, 3000);




const speeches = [
  "Education is the most powerful weapon which you can use to change the world. – Nelson Mandela",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "Don't let what you cannot do interfere with what you can do. – John Wooden",
  "Believe you can and you're halfway there. – Theodore Roosevelt"
];

let inde = 0;
const textBox = document.getElementById("motivation");

function changeSpeech() {
  textBox.textContent = speeches[inde];
  inde = (inde + 1) % speeches.length;  
}


changeSpeech();


setInterval(changeSpeech, 15000);





// Teacher search
const searchInput = document.getElementById("teacherSearch");
const teacherList = document.getElementById("teacherList");

searchInput.addEventListener("input", () => {
  fetch('/search-teacher?subject='+searchInput.value)
    .then(res => res.json())
    .then(data => {
      teacherList.innerHTML = "";
      data.forEach(t => {
        const li = document.createElement("li");
        li.textContent = `${t.name} - ${t.subject}`;
        teacherList.appendChild(li);
      });
    });
});
 document.getElementById('year').textContent = new Date().getFullYear();