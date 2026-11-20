UUID := finite@bush-le.github.io
BUNDLE := $(UUID).shell-extension.zip

.PHONY: schema test pack install uninstall logs

schema:
	glib-compile-schemas --strict schemas/

test:
	bash tests/smoke_test.sh

pack: schema
	gnome-extensions pack --force --extra-source=lib --schema=schemas/org.gnome.shell.extensions.finite.gschema.xml .

install: pack
	gnome-extensions install --force $(BUNDLE)

uninstall:
	gnome-extensions uninstall $(UUID)

logs:
	journalctl -f -o cat /usr/bin/gnome-shell
