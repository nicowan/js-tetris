# js-tetris

The aim of this project is to produce a simple block game that is playable without any pretention to be a finished game. It has been started for the fun of coding and nothing else!

In this game, the player has to place purposely the falling pieces on the game board to complete lines. The completed lines are deleted to free up some place in the board.

The game provides 2 kind of challenges : 


* **Normal** : The game lasts as long as there is place for new pieces to fall down. The speed of the game accelerates slowly after some lines were completed.

* **Sprint** :  The game starts with some randomly prefilled lines. To finish a level, the player must complete a given number of lines i a limited time. Over the levels, the game becomes faster and the number of line to complete increases.

Try it out: https://nicowan.github.io/js-tetris/www/

## Assets

The fonts used here were downloaded from https://www.1001freefonts.com/3dumb.font, they are published as *donationware*.

## TODO

* Ajouter option :
   * Afficher ou non la prochaine pièce
   * Montrer la destination finale de la pièce
* Ajouter le hard fall qui envoie la pièce tout en bas d'un coup
* Fonctionnement en mode tactile (joystick à l'écran)
* Sauver les score en local
* Sauver la configuration en local
* Possibilité de configurer les touches du clavier
* DONE Montrer la piece ghost
* DONE Descente des pièces pixels par pixels
* DONE Animation des lignes qui s'effacent
* DONE Implémenter le mode *Sprint*