PHOTO-ONLY PATCH — do not upload or deploy automatically

Why photos failed: index.html pointed to ./assets/memory-XX.jpeg, but the deployed repository currently has no assets folder or memory image files.

This patch is deliberately flat. Upload these files to the ROOT of your existing GitHub repository:
- index.html (replaces the current version)
- memory-01.jpeg
- memory-02.jpeg
- memory-03.jpeg
- memory-04.jpeg

Optional: favicon.svg, if you want the matching site icon from this version. You do not need to upload it to fix photos.

Keep all four memory JPEG files beside index.html. Do not put them inside another folder.
This patch only adjusts image paths and includes the original JPEG files unchanged; it does not add games, alter music playback, or change animations.
