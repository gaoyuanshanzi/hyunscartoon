import ast, sys
src = open('main.py', encoding='utf-8').read()
ast.parse(src)
print('Syntax OK')
