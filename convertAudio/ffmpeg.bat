for %f in (*.wav) do ffmpeg -i "%f" -c:a libvorbis -qscale:a 7 "%~nf.ogg"
del *.wav
