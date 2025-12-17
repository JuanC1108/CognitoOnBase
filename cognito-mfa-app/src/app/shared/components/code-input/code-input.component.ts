import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-code-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="code-input-container">
      @for (digit of digits; track $index; let i = $index) {
        <input
          #digitInput
          type="text"
          inputmode="numeric"
          maxlength="1"
          [value]="digit"
          [class.filled]="digit !== ''"
          [disabled]="disabled"
          (input)="onInput($event, i)"
          (keydown)="onKeyDown($event, i)"
          (paste)="onPaste($event)"
          (focus)="onFocus(i)"
        />
      }
    </div>
  `,
  styles: [
    `
      .code-input-container {
        display: flex;
        justify-content: center;
        gap: 8px;

        input {
          width: 48px;
          height: 56px;
          text-align: center;
          font-size: 24px;
          font-weight: 500;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          outline: none;
          transition: border-color 0.2s;

          &:focus {
            border-color: #1976d2;
          }

          &.filled {
            border-color: #4caf50;
          }

          &:disabled {
            background-color: #f5f5f5;
            cursor: not-allowed;
          }
        }
      }
    `,
  ],
})
export class CodeInputComponent implements AfterViewInit {
  @Input() length = 6;
  @Input() disabled = false;

  @Output() codeComplete = new EventEmitter<string>();
  @Output() codeChange = new EventEmitter<string>();

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits: string[] = [];

  ngOnInit(): void {
    this.digits = Array(this.length).fill('');
  }

  ngAfterViewInit(): void {
    // Focus first input on init
    setTimeout(() => {
      this.focusInput(0);
    });
  }

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9]/g, '');

    this.digits[index] = value;
    input.value = value;

    this.emitCodeChange();

    if (value && index < this.length - 1) {
      this.focusInput(index + 1);
    }

    if (this.isComplete()) {
      this.codeComplete.emit(this.getCode());
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        this.focusInput(index - 1);
        this.digits[index - 1] = '';
        this.emitCodeChange();
      } else {
        this.digits[index] = '';
        this.emitCodeChange();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInput(index - 1);
    } else if (event.key === 'ArrowRight' && index < this.length - 1) {
      event.preventDefault();
      this.focusInput(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, this.length);

    for (let i = 0; i < this.length; i++) {
      this.digits[i] = digits[i] || '';
    }

    this.emitCodeChange();

    // Focus last filled input or next empty
    const lastFilledIndex = Math.min(digits.length, this.length) - 1;
    if (lastFilledIndex >= 0) {
      this.focusInput(lastFilledIndex);
    }

    if (this.isComplete()) {
      this.codeComplete.emit(this.getCode());
    }
  }

  onFocus(index: number): void {
    // Select content on focus
    const inputs = this.digitInputs.toArray();
    if (inputs[index]) {
      inputs[index].nativeElement.select();
    }
  }

  reset(): void {
    this.digits = Array(this.length).fill('');
    this.focusInput(0);
  }

  private focusInput(index: number): void {
    const inputs = this.digitInputs.toArray();
    if (inputs[index]) {
      inputs[index].nativeElement.focus();
    }
  }

  private getCode(): string {
    return this.digits.join('');
  }

  private isComplete(): boolean {
    return this.digits.every((d) => d !== '');
  }

  private emitCodeChange(): void {
    this.codeChange.emit(this.getCode());
  }
}
