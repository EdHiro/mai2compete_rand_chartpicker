<?php
/**
 * Parsedown
 * http://parsedown.org
 *
 * (c) Emanuil Rusev
 * http://erusev.com
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * @version 1.7.4
 * @date 2017-12-02
 */

class Parsedown
{
    # 常量定义
    const version = '1.7.4';
    
    private $inlineTypes = array(
        '"' => array('SpecialCharacter'),
        '!' => array('Image'),
        '&' => array('SpecialCharacter'),
        '*' => array('Emphasis'),
        ':' => array('Url'),
        '<' => array('UrlTag', 'EmailTag', 'Markup', 'SpecialCharacter'),
        '>' => array('SpecialCharacter'),
        '[' => array('Link'),
        '_' => array('Emphasis'),
        '`' => array('Code'),
        '~' => array('Strikethrough'),
        '\\' => array('EscapeSequence'),
    );
    
    private $inlineMarkerList = '!"*_&[:<>`~\\';
    private $BlockTypes = array(
        '#' => array('Header'),
        '*' => array('Rule', 'List'),
        '+' => array('List'),
        '-' => array('Rule', 'List'),
        '0' => array('List'),
        '1' => array('List'),
        '2' => array('List'),
        '3' => array('List'),
        '4' => array('List'),
        '5' => array('List'),
        '6' => array('List'),
        '7' => array('List'),
        '8' => array('List'),
        '9' => array('List'),
        ':' => array('Table'),
        '>' => array('Quote'),
        '=' => array('Rule'),
        '_' => array('Rule'),
        '`' => array('FencedCode'),
        '|' => array('Table'),
    );
    
    public function text($text) {
        $text = str_replace(array("\r\n", "\r"), "\n", $text);
        $text = trim($text, "\n");
        
        $Lines = explode("\n", $text);
        $markup = $this->lines($Lines);
        
        return $markup;
    }
    
    protected function lines(array $lines) {
        $CurrentBlock = ['type' => null];  // 初始化为空数组而不是 null
        $blocks = array();
        
        foreach ($lines as $line) {
            if (rtrim($line) === '') {
                if ($CurrentBlock) {
                    $CurrentBlock['closed'] = true;
                }
                
                continue;
            }
            
            if (strpos($line, "\t") !== false) {
                $line = str_replace("\t", '    ', $line);
            }
            
            $indent = 0;
            
            while (isset($line[$indent]) and $line[$indent] === ' ') {
                $indent ++;
            }
            
            $text = $indent > 0 ? substr($line, $indent) : $line;
            
            $Line = array('body' => $line, 'indent' => $indent, 'text' => $text);
            
            if (isset($CurrentBlock['type']) && $CurrentBlock['type'] === 'Paragraph') {
                $Block = $this->paragraphContinue($Line, $CurrentBlock);
            }
            
            if (isset($Block)) {
                if (!isset($Block['type'])) {
                    continue;
                }
                
                $CurrentBlock = $Block;
                
                $blocks []= $Block;
                
                continue;
            }
            
            if ($CurrentBlock and ! isset($CurrentBlock['closed'])) {
                $Block = $this->{"block{$CurrentBlock['type']}Continue"}($Line, $CurrentBlock);
                
                if (isset($Block)) {
                    $CurrentBlock = $Block;
                    continue;
                }
            }
            
            if ($CurrentBlock and isset($CurrentBlock['closed'])) {
                $Block = $this->{"block{$CurrentBlock['type']}"}($Line);
                
                if (isset($Block)) {
                    $Block['closed'] = true;
                    
                    $blocks []= $Block;
                    $CurrentBlock = $Block;
                    
                    continue;
                }
            }
            
            $blocks []= $CurrentBlock;
            
            $CurrentBlock = $this->paragraph($Line);
        }
        
        return $blocks;
    }
    
    protected function paragraph($Line) {
        $Block = array(
            'type' => 'Paragraph',
            'text' => $Line['text'],
        );
        
        return $Block;
    }
    
    protected function paragraphContinue($Line, array $Block) {
        if ($Line['indent'] < 4) {
            $Block['text'] .= "\n".$Line['text'];
            
            return $Block;
        }
    }
}