# Publish the Arch package to AUR

The prepared package is `friends-and-fables-desktop-bin`. It downloads the x86_64 AppImage from the GitHub release, verifies its SHA-256, extracts it into `/opt/friends-and-fables-desktop`, and adds a launcher, icon, and desktop entry. The installed package does not mount an AppImage or need FUSE. It keeps Chromium's sandbox helper and passes your command-line options through.

AUR hosts the package recipe, not the compiled AppImage or a pacman package archive. Publish the GitHub release first so its download URL works.

## Test locally

Install the packaging tools:

```sh
sudo pacman -S --needed base-devel git pacman-contrib desktop-file-utils
```

From the project root, copy the recipe to a separate working directory:

```sh
mkdir -p ~/aur/friends-and-fables-desktop-bin
cp packaging/aur/PKGBUILD packaging/aur/.SRCINFO packaging/aur/friends-and-fables-desktop packaging/aur/friends-and-fables-desktop.desktop ~/aur/friends-and-fables-desktop-bin/
cd ~/aur/friends-and-fables-desktop-bin
desktop-file-validate friends-and-fables-desktop.desktop
makepkg -si
friends-and-fables-desktop
```

Run `makepkg` as your normal user. It asks for sudo when pacman needs to install dependencies or the finished package. Check login, settings persistence, zoom, pictures, context/dice styling, and Hyprland behavior. `makepkg --printsrcinfo` can be used without building the package.

## Create an AUR account and SSH key

1. Create an account at [aur.archlinux.org](https://aur.archlinux.org/register).
2. Check that `friends-and-fables-desktop-bin` is not already owned by someone else. If it is, contact the maintainer or use AUR's adoption/request process.
3. Generate an SSH key for AUR if you do not already have one:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/aur -C "AUR package maintenance"
cat ~/.ssh/aur.pub
```

Add the public key to your AUR account. Keep the private key local. Add this entry to `~/.ssh/config`:

```text
Host aur.archlinux.org
    User aur
    IdentityFile ~/.ssh/aur
    IdentitiesOnly yes
```

Verify the server fingerprint using [AUR authentication guidance](https://wiki.archlinux.org/title/AUR_submission_guidelines#Authentication), then test:

```sh
ssh aur@aur.archlinux.org help
```

## Submit the recipe

Clone the AUR repository into a fresh directory; the first push creates a new package:

```sh
mkdir -p ~/aur-publish
cd ~/aur-publish
git -c init.defaultBranch=master clone ssh://aur@aur.archlinux.org/friends-and-fables-desktop-bin.git
cd friends-and-fables-desktop-bin
cp ~/aur/friends-and-fables-desktop-bin/PKGBUILD ~/aur/friends-and-fables-desktop-bin/friends-and-fables-desktop ~/aur/friends-and-fables-desktop-bin/friends-and-fables-desktop.desktop .
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO friends-and-fables-desktop friends-and-fables-desktop.desktop
git commit -m "Initial release 0.1.0"
git push origin master
```

Only add those source files. Do not add `src/`, `pkg/`, the AppImage, or `.pkg.tar.zst` files. The resulting page is `https://aur.archlinux.org/packages/friends-and-fables-desktop-bin`. Users can install it through their AUR helper after publication.

## Update the package

Publish the new GitHub release, then update `pkgver` in `PKGBUILD` and set `pkgrel=1`. Download the new AppImage and regenerate checksums:

```sh
updpkgsums
makepkg -si
makepkg --printsrcinfo > .SRCINFO
git add PKGBUILD .SRCINFO
git commit -m "Update to NEW_VERSION"
git push origin master
```

Increase `pkgrel` instead of `pkgver` when only the Arch packaging changes. Keep the prepared files under `packaging/aur/` in the GitHub project synchronized with the AUR repository.

References: [AUR submission guidelines](https://wiki.archlinux.org/title/AUR_submission_guidelines), [Arch package guidelines](https://wiki.archlinux.org/title/Arch_package_guidelines), [PKGBUILD reference](https://wiki.archlinux.org/title/PKGBUILD).
