# rebreader
Redirects various non-free services to more private and lighter alternative
front-ends.

## Supported services
Below is a hopefully up-to-date[^hopefully] list of them. You can always [check the
source](./data/services.json)! These are the 'primary services', meaning primary
official domains for given services. Please refer to the
[`data/instances.json`](./data/instances.json) file for a list of supported instances
of these services.

[^hopefully]: We[^please-help] try to regenerate it with a pre-commit hook...
[^please-help]: 'We' because You can contribute too hehehe

<!--service-table-start-->
| Service | Front-end |
| ------- | --------- |
| [instagram.com](https://instagram.com/) | [bibliogram.art](https://bibliogram.art/) |
| [medium.com](https://medium.com/) | [scribe.rip](https://scribe.rip/) |
| [music.youtube.com](https://music.youtube.com/) | [beatbump.ml](https://beatbump.ml/) |
| [quora.com](https://quora.com/) | [quetre.herokuapp.com](https://quetre.herokuapp.com/) |
| [reddit.com](https://reddit.com/) | [libreddit.nl](https://libreddit.nl/) |
| [twitter.com](https://twitter.com/) | [nitter.nl](https://nitter.nl/) |
| [youtube.com](https://youtube.com/) | [piped.kavin.rocks](https://piped.kavin.rocks/) |
<!--service-table-end-->

## Performance impact
We tried our best..

Before a request is made, its details get passed to the extension, which then
attempts to redirect it. Thanks to the WebRequests API, only websites matching the
provided filter are processed, so the performance impact should be relatively small.

After the browser makes any request, the extension attempts to check if it, by any
chance, hasn't let some service through. It checks the respones headers in the
background, without blocking anything. Computers nowadays are pretty powerful, so it
shouldn't hurt your processor that much 😅

(Not taking any resposnsibility for the power consumption though)

## Required permissions
We need access to WebRequests on all hosts as the self-improving discovery feature
relies on it. You can always review the source code of the extension, we tried to
explain a lot of stuff in comments.

## Development
### Requirements
Required tools for [`scripts`](./scripts/):
- Shell compatible with busybox Ash (not really a requirement then)
- jq
- zip
- sed (tested on busybox)
- cat (tested on buxybox)

Everything is tested on a stock Alpine 3.16 with just `apk add jq zip`.

### Building
1. Clone the repository and enter the directory:
```sh
~ $ git clone https://github.com/nadvagauser/rebreader
~ $ cd rebreader
```
2. Run the `./build` script:
```sh
~/rebreader $ ./build
```
3. The resulting file is in `dist/`:
```sh
~/rebreader $ file dist/rebreader-firefox-1.0.0.zip
dist/rebreader-firefox-1.0.0.zip: Zip archive data, at least v1.0 to extract, compression method=store
```

### Adding new services
- [`data/services.json`](./data/services.json) - redirections for primary services
- [`data/instances.json`](./data/instances.json) - redirections for instances (other
  front-ends, mirrors, alternate domains, shortlinks)

## Assistance or questions
You can either [create an Issue](https://github.com/nadvagauser/rebreader/issues/new)
or [send me an e-mail](mailto:nadvagauser+rebreader@proton.me).

## Various ideas for later (not-a-todo-list)
- Generate something like `data/instances.auto.json` from APIs and files exposed by
  various front-ends and merge it with `data/instances.json`?
- Don't redirect certain services if the user is authenticated?
- Editor for the local dictionary?
- Collaboration on the dictionary through some kind of a syncing service?
- Function-based dictionary with URL transformations included?
- Other ways to represent a dictionary to remove redundancy? Maybe a many-to-one
  two-array lookup?

## License
This extension is [MIT-licensed](https://choosealicense.com/licenses/mit), per the
[`LICENSE`](./LICENSE) file.
