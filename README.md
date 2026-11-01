# Xynth
The Xynth is an experiment in what we call cosmotechnic sonification. 
Following Yuk Hui’s concept of cosmotechnics—which challenges the universalizing singularity of technology in favor of localized, diverse technical realities—this synthesizer treats the blockchain not as a universal ledger of value, but as a specific, alien cosmology. It creates a "sensory commons" where the data of the blockchain is stripped of its exchange value and refunctionalized as pure vibration. This new direction is an act of sorcery on itself, a practice “with anonymous materials" (Negarestani, 2008, p. 1). The blockchain is a precious anonymous material—a headless, decentralized swarm. By plugging this swarm into a synthesis engine, the Xynth does not "play" music; it allows the "Xyn" —the open, twisting mesh of outside forces—to speak. The Xynth is borne as a mutant site of "radical openness," a "wound" in the silence of the anthropocene through which the "Hidden Writing" (Negarestani, 2008, p. 60) of the blockchain bleeds into the auditory realm.
Work in progress. Feel free to let me know your comments and share any sound experiments you do with it ♡

## Reproducible development checks

CI uses Node.js 22.23.4 and `npm ci` with the committed lockfile. Run `npm run lint`, `npm test` and `npm run build` for static validation, bounded archive-parser regression cases and the production build. `npx playwright install chromium` prepares the browser used by `npm run test:e2e`.

Desktop/mobile Chromium checks exercise the local built interface, audio startup, WebGL and mute/volume controls. Synthetic fixtures replace the four data-service origins; unexpected external requests are blocked. No live RPC, account, wallet, microphone or recording is used. This is software/API qualification, not a claim of human listening or physical-device coverage.

The two existing fflate release lines receive compatible security backports, 0.6.11 and 0.8.3. Archive-parser regression cases run in workers with a two-second termination bound. The application's model/archive feature reachability is separate from the presence of a package version in the dependency graph.

Pull-request CI retains only bounded public HTML/JS/CSS/SVG build files and hash receipts for seven days. Review the actual artifact and target/restoration identity before publication. The existing manual Cloudflare publication command is not invoked by these checks.
