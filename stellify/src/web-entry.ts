/** Hosted web build entry: a one-line loader, so no shared chunk ever imports from the entry (avoids init-order cycles). */
void import('./main');
