# Simple Lyrics
I enjoy singing, but I get stuck when I do not know the lyrics. 

Spotify sometimes fails to fetch them, even when Musixmatch has them, so I built my own.

![Thumbnail](./simple-lyrics.gif)

## Features
- Fetch the lyrics
- Copy it
- Autofocus
- Spinning record uweuwuw
- Translation

## Use it
Use it with [Spicetify](https://github.com/spicetify/spicetify-cli)

Copy [custom_lyrics.js](https://github.com/KOlCIqwq/custom_lyrics/blob/main/built/custom_lyrics.js) from the built folder into your Spicetify extensions directory:
| **Platform** | **Path**                                                                               |
|------------|------------------------------------------------------------------------------------------|
| **Linux**      | `~/.config/spicetify/Extensions` or `$XDG_CONFIG_HOME/.config/spicetify/Extensions/` |
| **MacOS**      | `~/.config/spicetify/Extensions` or `$SPICETIFY_CONFIG/Extensions`                   |
| **Windows**    | `%appdata%/spicetify/Extensions/`                                               |

After putting the extension file into the correct folder, run the following command to install the extension:
```
spicetify config extensions custom_lyrics.js
spicetify apply
```
Note: Using the `config` command to add the extension will always append the file name to the existing extensions list. It does not replace the whole key's value.

A button will appear at bottom right

## Provider
- [LRCLIB](https://lrclib.net/)
- Sadly Musixmatch closed their developer registration

## Made with Spicetify Creator
- https://github.com/spicetify/spicetify-creator
